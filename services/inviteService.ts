import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PrimeInvite } from '@/types/registration.types';
import { convertPrimeInviteDates, convertPrimeTeamDates } from '@/utils/firestoreConverters';
import {
  InviteAlreadySentError,
  TeamNotFoundError,
  InviteNotFoundError,
  InviteNotPendingError,
  UnauthorizedError,
} from '@/types/errors';

// ——— Helpers ———

function teamDocId(eventId: string, captainId: string): string {
  return `${eventId}_${captainId}`;
}

// ——— Enviar convite ———

export interface SendInviteInput {
  eventId: string;
  eventTitle: string;
  captainId: string;
  captainName: string;
  captainAvatarUrl?: string;
  toUserId: string;
  toDisplayName: string;
  toAvatarUrl?: string;
  toPosition?: string;
}

/**
 * Cria um convite e adiciona o jogador ao time com status 'pending'.
 * Operação atômica via transação.
 */
export async function sendInvite(input: SendInviteInput): Promise<string> {
  const teamDocRef = doc(db, 'primeTeams', teamDocId(input.eventId, input.captainId));

  // Verifica se o usuário já tem convite pendente/aceito neste time
  const existingInvitesQ = query(
    collection(db, 'invites'),
    where('eventId', '==', input.eventId),
    where('captainId', '==', input.captainId),
    where('toUserId', '==', input.toUserId),
    where('status', 'in', ['pending', 'accepted']),
  );
  const existing = await getDocs(existingInvitesQ);
  if (!existing.empty) throw new InviteAlreadySentError();

  // Cria o documento de convite
  const inviteRef = await addDoc(collection(db, 'invites'), {
    eventId: input.eventId,
    eventTitle: input.eventTitle,
    captainId: input.captainId,
    captainName: input.captainName,
    ...(input.captainAvatarUrl ? { captainAvatarUrl: input.captainAvatarUrl } : {}),
    toUserId: input.toUserId,
    toDisplayName: input.toDisplayName,
    ...(input.toAvatarUrl ? { toAvatarUrl: input.toAvatarUrl } : {}),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Adiciona membro ao time com status 'pending'
  await runTransaction(db, async (tx) => {
    const teamSnap = await tx.get(teamDocRef);
    if (!teamSnap.exists()) throw new TeamNotFoundError();

    const data = teamSnap.data();
    const members: Record<string, unknown>[] = Array.isArray(data.members) ? [...data.members] : [];

    const newMember: Record<string, unknown> = {
      userId: input.toUserId,
      displayName: input.toDisplayName,
      inviteStatus: 'pending',
      inviteId: inviteRef.id,
      addedAt: new Date().toISOString(),
    };
    if (input.toAvatarUrl) newMember.avatarUrl = input.toAvatarUrl;
    if (input.toPosition) newMember.position = input.toPosition;

    members.push(newMember);

    tx.update(teamDocRef, {
      members,
      updatedAt: serverTimestamp(),
    });
  });

  return inviteRef.id;
}

// ——— Aceitar convite ———

export async function acceptInvite(inviteId: string, userId: string): Promise<void> {
  const inviteRef = doc(db, 'invites', inviteId);

  await runTransaction(db, async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists()) throw new InviteNotFoundError();

    const invite = inviteSnap.data();
    if (invite.toUserId !== userId) throw new UnauthorizedError('Convite não é para você');
    if (invite.status !== 'pending') throw new InviteNotPendingError();

    const teamRef = doc(db, 'primeTeams', teamDocId(invite.eventId, invite.captainId));
    const teamSnap = await tx.get(teamRef);
    if (!teamSnap.exists()) throw new TeamNotFoundError();

    const teamData = teamSnap.data();
    const members = (teamData.members as Record<string, unknown>[]).map((m) =>
      m.inviteId === inviteId ? { ...m, inviteStatus: 'accepted' } : m,
    );

    tx.update(inviteRef, { status: 'accepted', updatedAt: serverTimestamp() });
    tx.update(teamRef, { members, updatedAt: serverTimestamp() });
  });
}

// ——— Recusar convite ———

export async function declineInvite(inviteId: string, userId: string): Promise<void> {
  const inviteRef = doc(db, 'invites', inviteId);

  await runTransaction(db, async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists()) throw new InviteNotFoundError();

    const invite = inviteSnap.data();
    if (invite.toUserId !== userId) throw new UnauthorizedError('Convite não é para você');
    if (invite.status !== 'pending') throw new InviteNotPendingError();

    const teamRef = doc(db, 'primeTeams', teamDocId(invite.eventId, invite.captainId));
    const teamSnap = await tx.get(teamRef);
    if (!teamSnap.exists()) throw new TeamNotFoundError();

    const teamData = teamSnap.data();
    // Remove o membro do time ao recusar
    const members = (teamData.members as Record<string, unknown>[]).filter(
      (m) => m.inviteId !== inviteId,
    );

    tx.update(inviteRef, { status: 'declined', updatedAt: serverTimestamp() });
    tx.update(teamRef, { members, updatedAt: serverTimestamp() });
  });
}

// ——— Cancelar convite (pelo capitão) ———

export async function cancelInvite(inviteId: string, captainId: string): Promise<void> {
  const inviteRef = doc(db, 'invites', inviteId);

  await runTransaction(db, async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists()) throw new InviteNotFoundError();

    const invite = inviteSnap.data();
    if (invite.captainId !== captainId) throw new UnauthorizedError('Apenas o capitão pode cancelar o convite');
    if (invite.status === 'accepted') throw new InviteNotPendingError();

    const teamRef = doc(db, 'primeTeams', teamDocId(invite.eventId, invite.captainId));
    const teamSnap = await tx.get(teamRef);

    if (teamSnap.exists()) {
      const teamData = teamSnap.data();
      const members = (teamData.members as Record<string, unknown>[]).filter(
        (m) => m.inviteId !== inviteId,
      );
      tx.update(teamRef, { members, updatedAt: serverTimestamp() });
    }

    tx.update(inviteRef, { status: 'declined', updatedAt: serverTimestamp() });
  });
}

// ——— Real-time: inbox do usuário ———

export function subscribeToUserInvites(
  userId: string,
  callback: (invites: PrimeInvite[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'invites'),
    where('toUserId', '==', userId),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(q, (snapshot) => {
    const invites: PrimeInvite[] = snapshot.docs.map((d) => {
      const data = convertPrimeInviteDates(d.data() as Record<string, unknown>);
      return { ...data, id: d.id } as PrimeInvite;
    });
    callback(invites);
  });
}

// ——— Real-time: convites enviados pelo capitão (para checar status) ———

export function subscribeToSentInvites(
  captainId: string,
  eventId: string,
  callback: (invites: PrimeInvite[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'invites'),
    where('captainId', '==', captainId),
    where('eventId', '==', eventId),
    orderBy('createdAt', 'asc'),
  );

  return onSnapshot(q, (snapshot) => {
    const invites: PrimeInvite[] = snapshot.docs.map((d) => {
      const data = convertPrimeInviteDates(d.data() as Record<string, unknown>);
      return { ...data, id: d.id } as PrimeInvite;
    });
    callback(invites);
  });
}

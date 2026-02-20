import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PrimeTeam } from '@/types/registration.types';
import type { Registration } from '@/types/registration.types';
import type { User } from '@/types/user.types';
import { convertPrimeTeamDates } from '@/utils/firestoreConverters';

// ——— Helpers ———

function teamDocId(eventId: string, captainId: string): string {
  return `${eventId}_${captainId}`;
}

// ——— Criação / inicialização do time ———

/**
 * Garante que um documento de time existe para o capitão.
 * Chamado quando a capitã abre o painel pela primeira vez.
 */
export async function ensureTeamExists(
  eventId: string,
  captain: Pick<Registration, 'userId' | 'displayName' | 'avatarUrl'>,
): Promise<PrimeTeam> {
  const id = teamDocId(eventId, captain.userId);
  const ref = doc(db, 'primeTeams', id);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = convertPrimeTeamDates(snap.data() as Record<string, unknown>);
    return { ...data, id: snap.id } as PrimeTeam;
  }

  const newTeam = {
    eventId,
    captainId: captain.userId,
    captainName: captain.displayName,
    ...(captain.avatarUrl ? { captainAvatarUrl: captain.avatarUrl } : {}),
    members: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, newTeam);
  return {
    id,
    ...newTeam,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
  } as PrimeTeam;
}

// ——— Leitura ———

export async function getEventTeams(eventId: string): Promise<PrimeTeam[]> {
  const q = query(collection(db, 'primeTeams'), where('eventId', '==', eventId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = convertPrimeTeamDates(d.data() as Record<string, unknown>);
    return { ...data, id: d.id } as PrimeTeam;
  });
}

// ——— Real-time ———

export function subscribeToEventTeams(
  eventId: string,
  callback: (teams: PrimeTeam[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'primeTeams'),
    where('eventId', '==', eventId),
    orderBy('createdAt', 'asc'),
  );

  return onSnapshot(q, (snapshot) => {
    const teams: PrimeTeam[] = snapshot.docs.map((d) => {
      const data = convertPrimeTeamDates(d.data() as Record<string, unknown>);
      return { ...data, id: d.id } as PrimeTeam;
    });
    callback(teams);
  });
}

// ——— Jogadores disponíveis para convite ———

/**
 * Retorna usuários que podem receber convite para um time do evento Prime.
 * Exclui capitãs, membros já nos times e quem tem convite pendente/aceito.
 */
export async function getAvailablePlayers(
  eventId: string,
): Promise<Pick<User, 'uid' | 'displayName' | 'avatarUrl' | 'position'>[]> {
  const [usersSnap, teamsSnap, invitesSnap] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('availableForTeam', '==', true))),
    getDocs(query(collection(db, 'primeTeams'), where('eventId', '==', eventId))),
    getDocs(
      query(
        collection(db, 'invites'),
        where('eventId', '==', eventId),
        where('status', 'in', ['pending', 'accepted']),
      ),
    ),
  ]);

  const excluded = new Set<string>();

  teamsSnap.docs.forEach((d) => {
    const data = d.data();
    excluded.add(data.captainId as string);
    ((data.members as { userId: string }[]) ?? []).forEach((m) => excluded.add(m.userId));
  });

  invitesSnap.docs.forEach((d) => {
    excluded.add(d.data().toUserId as string);
  });

  return usersSnap.docs
    .map((d) => {
      const u = d.data();
      return {
        uid: d.id,
        displayName: u.displayName ?? '',
        avatarUrl: u.avatarUrl,
        position: u.position,
      };
    })
    .filter((u) => !excluded.has(u.uid));
}

import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  increment,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Registration } from '@/types/registration.types';
import type { Event } from '@/types/event.types';
import { convertRegistrationDates, convertEventDates } from '@/utils/firestoreConverters';
import {
  EventNotFoundError,
  RegistrationClosedError,
  AlreadyRegisteredError,
  RegistrationNotFoundError,
  RegistrationCancelledError,
  EventCancelledError,
  PassportNotFoundError,
} from '@/types/errors';

// ——— Helpers ———

function registrationDocId(eventId: string, userId: string): string {
  return `${eventId}_${userId}`;
}

// ——— Inscrição (atômica) ———

export interface RegisterInput {
  eventId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  playerPosition?: import('@/types/user.types').PlayerPosition;
}

export async function registerForEvent(input: RegisterInput): Promise<Registration> {
  const regDocId = registrationDocId(input.eventId, input.userId);
  const regRef = doc(db, 'registrations', regDocId);
  const eventRef = doc(db, 'events', input.eventId);

  return runTransaction(db, async (tx) => {
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists()) throw new EventNotFoundError();
    const eventData = eventSnap.data();

    // Permite inscrição se status === 'open', ou se 'upcoming' e horário de abertura já passou
    const registrationOpensAt = eventData.registrationOpensAt;
    const listOpenedByTime =
      eventData.status === 'upcoming' &&
      registrationOpensAt instanceof Timestamp &&
      registrationOpensAt.toMillis() <= Date.now();

    if (eventData.status !== 'open' && !listOpenedByTime) {
      throw new RegistrationClosedError();
    }

    const existingSnap = await tx.get(regRef);
    if (existingSnap.exists() && existingSnap.data().status !== 'cancelled') {
      throw new AlreadyRegisteredError();
    }

    const confirmedCount = eventData.confirmedCount as number;
    const waitlistCount = eventData.waitlistCount as number;
    const maxParticipants = eventData.maxParticipants as number;
    const totalPosition = confirmedCount + waitlistCount + 1;

    const isConfirmed = confirmedCount < maxParticipants;
    const status = isConfirmed ? 'confirmed' : 'waitlist';
    const waitlistPosition = isConfirmed ? undefined : waitlistCount + 1;

    const regData = {
      eventId: input.eventId,
      userId: input.userId,
      displayName: input.displayName,
      ...(input.avatarUrl && { avatarUrl: input.avatarUrl }),
      ...(input.playerPosition && { playerPosition: input.playerPosition }),
      status,
      position: totalPosition,
      ...(waitlistPosition !== undefined && { waitlistPosition }),
      registeredAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    tx.set(regRef, regData);

    if (isConfirmed) {
      tx.update(eventRef, {
        // Auto-transiciona 'upcoming' → 'open' na primeira inscrição
        ...(listOpenedByTime && { status: 'open' }),
        confirmedCount: increment(1),
        updatedAt: serverTimestamp(),
        ...(confirmedCount + 1 >= maxParticipants && { status: 'full' }),
      });
    } else {
      tx.update(eventRef, {
        ...(listOpenedByTime && { status: 'open' }),
        waitlistCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    }

    return { ...regData, id: regDocId } as unknown as Registration;
  });
}

// ——— Cancelar inscrição (atômico + promoção waitlist) ———

export async function cancelRegistration(eventId: string, userId: string): Promise<void> {
  const regDocId = registrationDocId(eventId, userId);
  const regRef = doc(db, 'registrations', regDocId);
  const eventRef = doc(db, 'events', eventId);

  await runTransaction(db, async (tx) => {
    const regSnap = await tx.get(regRef);
    if (!regSnap.exists()) throw new RegistrationNotFoundError();
    const regData = regSnap.data();

    if (regData.status === 'cancelled') {
      throw new RegistrationCancelledError();
    }

    const wasConfirmed = regData.status === 'confirmed';

    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists()) throw new EventNotFoundError();
    const eventData = eventSnap.data();

    tx.update(regRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });

    if (wasConfirmed) {
      tx.update(eventRef, {
        confirmedCount: increment(-1),
        updatedAt: serverTimestamp(),
        ...(eventData.status === 'full' && { status: 'open' }),
      });
    } else {
      tx.update(eventRef, {
        waitlistCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    }
  });

  await promoteFromWaitlist(eventId);
}

// ——— Promoção automática da fila de espera ———

async function promoteFromWaitlist(eventId: string): Promise<void> {
  const eventRef = doc(db, 'events', eventId);

  const waitlistQuery = query(
    collection(db, 'registrations'),
    where('eventId', '==', eventId),
    where('status', '==', 'waitlist'),
    orderBy('position', 'asc'),
  );
  const waitlistSnap = await getDocs(waitlistQuery);
  if (waitlistSnap.empty) return;

  const firstWaitlisted = waitlistSnap.docs[0];
  const firstRegRef = doc(db, 'registrations', firstWaitlisted.id);

  await runTransaction(db, async (tx) => {
    const regSnap = await tx.get(firstRegRef);
    if (!regSnap.exists() || regSnap.data().status !== 'waitlist') return;

    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists()) return;
    const eventData = eventSnap.data();
    const confirmedCount = eventData.confirmedCount as number;
    const maxParticipants = eventData.maxParticipants as number;

    if (confirmedCount >= maxParticipants) return;

    tx.update(firstRegRef, {
      status: 'confirmed',
      waitlistPosition: null,
      updatedAt: serverTimestamp(),
    });

    tx.update(eventRef, {
      confirmedCount: increment(1),
      waitlistCount: increment(-1),
      updatedAt: serverTimestamp(),
      ...(confirmedCount + 1 >= maxParticipants && { status: 'full' }),
    });
  });
}

// ——— Leitura ———

export async function getUserRegistration(
  eventId: string,
  userId: string,
): Promise<Registration | null> {
  const regDocId = registrationDocId(eventId, userId);
  const snap = await getDoc(doc(db, 'registrations', regDocId));
  if (!snap.exists()) return null;
  const data = convertRegistrationDates(snap.data() as Record<string, unknown>);
  return { ...data, id: snap.id } as Registration;
}

// ——— Real-time ———

export function subscribeToEventRegistrations(
  eventId: string,
  callback: (registrations: Registration[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'registrations'),
    where('eventId', '==', eventId),
    where('status', 'in', ['confirmed', 'waitlist']),
    orderBy('position', 'asc'),
  );

  return onSnapshot(q, (snapshot) => {
    const registrations: Registration[] = snapshot.docs.map((d) => {
      const data = convertRegistrationDates(d.data() as Record<string, unknown>);
      return { ...data, id: d.id } as Registration;
    });
    callback(registrations);
  });
}

export function subscribeToUserRegistrations(
  userId: string,
  callback: (registrations: Registration[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'registrations'),
    where('userId', '==', userId),
    where('status', 'in', ['confirmed', 'waitlist']),
  );

  return onSnapshot(q, (snapshot) => {
    const registrations: Registration[] = snapshot.docs.map((d) => {
      const data = convertRegistrationDates(d.data() as Record<string, unknown>);
      return { ...data, id: d.id } as Registration;
    });
    callback(registrations);
  });
}

// ——— Scanner / Validação de passaporte ———

export async function scanPassport(
  registrationId: string,
): Promise<{ registration: Registration; event: Event }> {
  const regRef = doc(db, 'registrations', registrationId);
  const regSnap = await getDoc(regRef);

  if (!regSnap.exists()) throw new PassportNotFoundError();

  const regData = convertRegistrationDates(regSnap.data() as Record<string, unknown>);
  const registration = { ...regData, id: regSnap.id } as Registration;

  if (registration.status === 'cancelled') throw new RegistrationCancelledError();

  const eventRef = doc(db, 'events', registration.eventId);
  const eventSnap = await getDoc(eventRef);

  if (!eventSnap.exists()) throw new EventNotFoundError();

  const eventData = convertEventDates(eventSnap.data() as Record<string, unknown>);
  const event = { ...eventData, id: eventSnap.id } as Event;

  if (event.status === 'cancelled') throw new EventCancelledError();

  return { registration, event };
}

export async function confirmAttendance(
  registrationId: string,
  adminUid: string,
): Promise<void> {
  await updateDoc(doc(db, 'registrations', registrationId), {
    status: 'attended',
    passportScannedAt: serverTimestamp(),
    passportScannedBy: adminUid,
    updatedAt: serverTimestamp(),
  });
}

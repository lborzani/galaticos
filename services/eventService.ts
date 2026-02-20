import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Event, EventType, EventStatus } from '@/types/event.types';
import { convertEventDates } from '@/utils/firestoreConverters';
import { AdminRequiredError } from '@/types/errors';

// ——— Types ———

export interface CreateEventInput {
  title: string;
  type: EventType;
  eventDate: Date;
  location: string;
  maxParticipants: number;
  registrationOpensAt: Date;
}

export interface UpdateEventInput {
  title?: string;
  eventDate?: Date;
  location?: string;
  maxParticipants?: number;
  registrationOpensAt?: Date;
  status?: EventStatus;
}

// ——— Admin guard ———

async function assertAdmin(uid: string): Promise<void> {
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists() || userSnap.data().role !== 'admin') {
    throw new AdminRequiredError();
  }
}

// ——— CRUD ———

export async function createEvent(input: CreateEventInput, createdBy: string): Promise<string> {
  await assertAdmin(createdBy);

  const docRef = await addDoc(collection(db, 'events'), {
    ...input,
    eventDate: Timestamp.fromDate(input.eventDate),
    registrationOpensAt: Timestamp.fromDate(input.registrationOpensAt),
    status: 'upcoming' as EventStatus,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    notificationsSent: { oneHourBefore: false, fiveMinutesBefore: false },
    confirmedCount: 0,
    waitlistCount: 0,
  });
  return docRef.id;
}

export async function updateEvent(eventId: string, input: UpdateEventInput, uid: string): Promise<void> {
  await assertAdmin(uid);

  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (input.title !== undefined) updates.title = input.title;
  if (input.location !== undefined) updates.location = input.location;
  if (input.maxParticipants !== undefined) updates.maxParticipants = input.maxParticipants;
  if (input.status !== undefined) updates.status = input.status;
  if (input.eventDate) updates.eventDate = Timestamp.fromDate(input.eventDate);
  if (input.registrationOpensAt) updates.registrationOpensAt = Timestamp.fromDate(input.registrationOpensAt);

  await updateDoc(doc(db, 'events', eventId), updates);
}

export async function cancelEvent(eventId: string, uid: string, reason: string): Promise<void> {
  await assertAdmin(uid);

  await updateDoc(doc(db, 'events', eventId), {
    status: 'cancelled',
    cancellationReason: reason,
    cancelledAt: serverTimestamp(),
    cancelledBy: uid,
    updatedAt: serverTimestamp(),
  });
}

// ——— Leitura ———

export async function getEvent(eventId: string): Promise<Event | null> {
  const snap = await getDoc(doc(db, 'events', eventId));
  if (!snap.exists()) return null;
  const data = convertEventDates(snap.data() as Record<string, unknown>);
  return { ...data, id: snap.id } as Event;
}

// ——— Real-time ———

export function subscribeToEvents(callback: (events: Event[]) => void): Unsubscribe {
  const q = query(collection(db, 'events'), orderBy('eventDate', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const events: Event[] = snapshot.docs.map((d) => {
      const data = convertEventDates(d.data() as Record<string, unknown>);
      return { ...data, id: d.id } as Event;
    });
    callback(events);
  });
}

export function subscribeToEvent(
  eventId: string,
  callback: (event: Event | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'events', eventId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = convertEventDates(snap.data() as Record<string, unknown>);
    callback({ ...data, id: snap.id } as Event);
  });
}

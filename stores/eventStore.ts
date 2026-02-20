import { create } from 'zustand';
import type { Event } from '@/types/event.types';
import type { Registration } from '@/types/registration.types';
import { subscribeToEvents } from '@/services/eventService';
import { subscribeToUserRegistrations } from '@/services/registrationService';
import { cancelEventReminders, notifyEventCancelled } from '@/services/notificationService';
import type { Unsubscribe } from 'firebase/firestore';

interface EventState {
  events: Event[];
  userRegistrations: Registration[];
  isLoading: boolean;

  getUpcomingEvents: () => Event[];
  getPastEvents: () => Event[];
  getUserRegistrationForEvent: (eventId: string) => Registration | undefined;
  isUserRegistered: (eventId: string) => boolean;

  startListening: (userId: string) => void;
  stopListening: () => void;
}

let unsubEvents: Unsubscribe | null = null;
let unsubUserRegs: Unsubscribe | null = null;

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  userRegistrations: [],
  isLoading: true,

  getUpcomingEvents: () =>
    get().events.filter((e) => e.status !== 'finished' && e.status !== 'cancelled'),

  getPastEvents: () =>
    get().events.filter((e) => e.status === 'finished' || e.status === 'cancelled'),

  getUserRegistrationForEvent: (eventId: string) =>
    get().userRegistrations.find((r) => r.eventId === eventId),

  isUserRegistered: (eventId: string) =>
    get().userRegistrations.some((r) => r.eventId === eventId),

  startListening: (userId: string) => {
    // Evita listeners duplicados
    if (unsubEvents) return;

    set({ isLoading: true });

    unsubEvents = subscribeToEvents((events) => {
      // Detecta eventos que acabaram de ser cancelados
      const previousEvents = get().events;
      for (const newEvent of events) {
        const prev = previousEvents.find((e) => e.id === newEvent.id);
        if (prev && prev.status !== 'cancelled' && newEvent.status === 'cancelled') {
          const userReg = get().getUserRegistrationForEvent(newEvent.id);
          if (userReg && userReg.status !== 'cancelled') {
            cancelEventReminders(newEvent.id).catch(() => {});
            notifyEventCancelled(newEvent.id, newEvent.title, newEvent.cancellationReason).catch(() => {});
          }
        }
      }
      set({ events, isLoading: false });
    });

    unsubUserRegs = subscribeToUserRegistrations(userId, (registrations) => {
      set({ userRegistrations: registrations });
    });
  },

  stopListening: () => {
    unsubEvents?.();
    unsubUserRegs?.();
    unsubEvents = null;
    unsubUserRegs = null;
    set({ events: [], userRegistrations: [], isLoading: true });
  },
}));

import { create } from 'zustand';
import type { Event } from '@/types/event.types';
import type { Registration } from '@/types/registration.types';
import { subscribeToEvent } from '@/services/eventService';
import { subscribeToEventRegistrations } from '@/services/registrationService';
import type { Unsubscribe } from 'firebase/firestore';

interface EventDetailState {
  event: Event | null;
  registrations: Registration[];
  isLoading: boolean;

  getConfirmed: () => Registration[];
  getWaitlist: () => Registration[];

  startListening: (eventId: string) => void;
  stopListening: () => void;
}

let unsubEvent: Unsubscribe | null = null;
let unsubRegs: Unsubscribe | null = null;

export const useEventDetailStore = create<EventDetailState>((set, get) => ({
  event: null,
  registrations: [],
  isLoading: true,

  getConfirmed: () => get().registrations.filter((r) => r.status === 'confirmed'),
  getWaitlist: () => get().registrations.filter((r) => r.status === 'waitlist'),

  startListening: (eventId: string) => {
    // Limpa listeners anteriores
    unsubEvent?.();
    unsubRegs?.();

    set({ isLoading: true, event: null, registrations: [] });

    unsubEvent = subscribeToEvent(eventId, (event) => {
      set({ event, isLoading: false });
    });

    unsubRegs = subscribeToEventRegistrations(eventId, (registrations) => {
      set({ registrations });
    });
  },

  stopListening: () => {
    unsubEvent?.();
    unsubRegs?.();
    unsubEvent = null;
    unsubRegs = null;
    set({ event: null, registrations: [], isLoading: true });
  },
}));

import { create } from 'zustand';
import type { PrimeInvite } from '@/types/registration.types';
import { subscribeToUserInvites } from '@/services/inviteService';
import type { Unsubscribe } from 'firebase/firestore';

interface InboxState {
  invites: PrimeInvite[];
  isLoading: boolean;

  getPendingInvites: () => PrimeInvite[];
  getPendingCount: () => number;

  startListening: (userId: string) => void;
  stopListening: () => void;
}

let unsubInvites: Unsubscribe | null = null;

export const useInboxStore = create<InboxState>((set, get) => ({
  invites: [],
  isLoading: false,

  getPendingInvites: () =>
    get().invites.filter((inv) => inv.status === 'pending'),

  getPendingCount: () =>
    get().invites.filter((inv) => inv.status === 'pending').length,

  startListening: (userId: string) => {
    unsubInvites?.();
    set({ isLoading: true, invites: [] });

    unsubInvites = subscribeToUserInvites(userId, (invites) => {
      set({ invites, isLoading: false });
    });
  },

  stopListening: () => {
    unsubInvites?.();
    unsubInvites = null;
    set({ invites: [], isLoading: false });
  },
}));

import { create } from 'zustand';
import type { PrimeTeam } from '@/types/registration.types';
import { subscribeToEventTeams } from '@/services/teamService';
import type { Unsubscribe } from 'firebase/firestore';

interface TeamStoreState {
  teams: PrimeTeam[];
  isLoading: boolean;
  currentEventId: string | null;

  getTeamByCaptain: (captainId: string) => PrimeTeam | undefined;
  getTotalMembers: () => number;

  startListening: (eventId: string) => void;
  stopListening: () => void;
}

let unsubTeams: Unsubscribe | null = null;

export const useTeamStore = create<TeamStoreState>((set, get) => ({
  teams: [],
  isLoading: false,
  currentEventId: null,

  getTeamByCaptain: (captainId: string) =>
    get().teams.find((t) => t.captainId === captainId),

  getTotalMembers: () =>
    get().teams.reduce((acc, t) => acc + t.members.length, 0),

  startListening: (eventId: string) => {
    if (get().currentEventId === eventId) return;

    unsubTeams?.();
    set({ isLoading: true, teams: [], currentEventId: eventId });

    unsubTeams = subscribeToEventTeams(eventId, (teams) => {
      set({ teams, isLoading: false });
    });
  },

  stopListening: () => {
    unsubTeams?.();
    unsubTeams = null;
    set({ teams: [], isLoading: false, currentEventId: null });
  },
}));

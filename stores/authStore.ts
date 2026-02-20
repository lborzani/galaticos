import { create } from 'zustand';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import type { User } from '@/types/user.types';

interface AuthState {
  user: User | null;
  firebaseUser: { uid: string; email: string | null } | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setFirebaseUser: (fbUser: { uid: string; email: string | null } | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
  fetchUserProfile: (uid: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  firebaseUser: null,
  isLoading: true,
  isAuthenticated: false,

  setFirebaseUser: (fbUser) =>
    set({
      firebaseUser: fbUser,
      isAuthenticated: fbUser !== null,
    }),

  setUser: (user) => set({ user }),

  setLoading: (isLoading) => set({ isLoading }),

  clearAuth: () =>
    set({
      user: null,
      firebaseUser: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  fetchUserProfile: async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data();
        set({
          user: {
            ...data,
            uid,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
          } as User,
        });
      }
    } catch {
      // Perfil não encontrado — não bloqueia o fluxo
    }
  },
}));

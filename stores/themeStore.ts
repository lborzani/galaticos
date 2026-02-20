import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  hasUserPreference: boolean;
  toggleTheme: () => void;
  setDark: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: true,
  hasUserPreference: false,
  toggleTheme: () =>
    set((state) => ({
      isDark: !state.isDark,
      hasUserPreference: true,
    })),
  setDark: (isDark) =>
    set({ isDark, hasUserPreference: true }),
}));

import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { DarkTheme, LightTheme, type Theme } from '@/constants/colors';
import { useThemeStore } from '@/stores/themeStore';

type ThemeContextValue = {
  theme: Theme;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: DarkTheme,
  isDark: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { isDark: isStoredDark, hasUserPreference } = useThemeStore();

  const isDark = hasUserPreference ? isStoredDark : systemScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

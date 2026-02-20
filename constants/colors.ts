export const Palette = {
  purple: {
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#4C1D95',
    900: '#3B0764',
  },
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const DarkTheme = {
  background: {
    primary: '#0F0F11',
    secondary: '#1C1C1E',
    elevated: '#2C2C2E',
    border: '#3A3A3C',
  },
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(235, 235, 245, 0.8)',
    muted: 'rgba(235, 235, 245, 0.6)',
    disabled: 'rgba(235, 235, 245, 0.3)',
    inverse: '#0F0F11',
  },
  accent: {
    primary: Palette.purple[500],
    secondary: Palette.purple[400],
    pressed: Palette.purple[600],
    subtle: 'rgba(139, 92, 246, 0.15)',
  },
  status: {
    success: '#34C759',
    successSubtle: 'rgba(52, 199, 89, 0.15)',
    warning: '#FF9F0A',
    warningSubtle: 'rgba(255, 159, 10, 0.15)',
    error: '#FF453A',
    errorSubtle: 'rgba(255, 69, 58, 0.15)',
    info: '#0A84FF',
    infoSubtle: 'rgba(10, 132, 255, 0.15)',
  },
} as const;

export const LightTheme = {
  background: {
    primary: '#F5F5F7',
    secondary: '#FFFFFF',
    elevated: '#F0F0F5',
    border: '#D1D1D6',
  },
  text: {
    primary: '#1C1C1E',
    secondary: 'rgba(60, 60, 67, 0.75)',
    muted: 'rgba(60, 60, 67, 0.55)',
    disabled: 'rgba(60, 60, 67, 0.3)',
    inverse: '#FFFFFF',
  },
  accent: {
    primary: Palette.purple[600],
    secondary: Palette.purple[500],
    pressed: Palette.purple[700],
    subtle: 'rgba(124, 58, 237, 0.1)',
  },
  status: {
    success: '#28A745',
    successSubtle: 'rgba(40, 167, 69, 0.12)',
    warning: '#FFC107',
    warningSubtle: 'rgba(255, 193, 7, 0.12)',
    error: '#DC3545',
    errorSubtle: 'rgba(220, 53, 69, 0.12)',
    info: '#007BFF',
    infoSubtle: 'rgba(0, 123, 255, 0.12)',
  },
} as const;

export interface Theme {
  background: { primary: string; secondary: string; elevated: string; border: string };
  text: { primary: string; secondary: string; muted: string; disabled: string; inverse: string };
  accent: { primary: string; secondary: string; pressed: string; subtle: string };
  status: {
    success: string; successSubtle: string;
    warning: string; warningSubtle: string;
    error: string; errorSubtle: string;
    info: string; infoSubtle: string;
  };
}

import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';

export default function AuthLayout() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background.primary },
        animation: 'slide_from_right',
      }}
    />
  );
}

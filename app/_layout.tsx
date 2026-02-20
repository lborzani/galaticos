import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
  useFonts,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { onAuthStateChanged } from '@/services/authService';
import { setupNotifications } from '@/services/notificationService';

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const { isDark, theme } = useTheme();
  const { setFirebaseUser, setLoading, fetchUserProfile, clearAuth } = useAuthStore();

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
  });

  // Esconde a splash assim que fontes carregam OU se der erro (evita tela infinita)
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        setFirebaseUser({ uid: fbUser.uid, email: fbUser.email });
        await fetchUserProfile(fbUser.uid);
        setupNotifications().catch(() => {});
      } else {
        clearAuth();
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Navega ao evento quando usuário toca em uma notificação
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { eventId?: string };
      if (data?.eventId) {
        router.push(`/(app)/evento/${data.eventId}`);
      }
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background.primary },
          animation: 'fade',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutInner />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

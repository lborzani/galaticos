import { useEffect } from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useEventStore } from '@/stores/eventStore';
import { useInboxStore } from '@/stores/inboxStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AppLayout() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { startListening, stopListening } = useEventStore();
  const { startListening: startInbox, stopListening: stopInbox } = useInboxStore();

  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      startListening(user.uid);
      startInbox(user.uid);
      return () => {
        stopListening();
        stopInbox();
      };
    }
  }, [isAuthenticated, user?.uid]);

  if (isLoading) {
    return <LoadingSpinner fullScreen label="Carregando..." />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}

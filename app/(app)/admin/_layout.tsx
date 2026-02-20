import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function AdminLayout() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner fullScreen label="Carregando..." />;
  }

  if (!user || user.role !== 'admin') {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

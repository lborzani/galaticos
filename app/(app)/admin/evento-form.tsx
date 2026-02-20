import { useState } from 'react';
import { ScrollView, StyleSheet, Alert, KeyboardAvoidingView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { createEvent } from '@/services/eventService';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { EventForm } from '@/components/events/EventForm';
import { Spacing } from '@/constants/spacing';
import type { EventType } from '@/types/event.types';

export default function CreateEventScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  async function handleCreate(data: {
    title: string;
    type: EventType;
    eventDate: Date;
    location: string;
    maxParticipants: number;
    registrationOpensAt: Date;
  }) {
    if (!user) return;
    setLoading(true);
    try {
      await createEvent(data, user.uid);
      Alert.alert('Sucesso', 'Evento criado!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao criar evento');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Button
            label="← Voltar"
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            style={styles.back}
          />

          <Text variant="h2" weight="bold" style={styles.title}>Novo evento</Text>
          <Text variant="body" color="muted" style={styles.subtitle}>
            Preencha os dados do evento
          </Text>

          <EventForm
            onSubmit={handleCreate}
            submitLabel="Criar evento"
            loading={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[10],
  },
  back: {
    alignSelf: 'flex-start',
    marginTop: Spacing[2],
  },
  title: {
    marginTop: Spacing[4],
  },
  subtitle: {
    marginBottom: Spacing[5],
  },
});

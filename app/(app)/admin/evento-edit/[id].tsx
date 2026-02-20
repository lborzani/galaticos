import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Modal, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { getEvent, updateEvent, cancelEvent } from '@/services/eventService';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EventForm } from '@/components/events/EventForm';
import { Spacing, BorderRadius } from '@/constants/spacing';
import type { Event, EventType } from '@/types/event.types';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal de cancelamento
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [openingList, setOpeningList] = useState(false);

  useEffect(() => {
    if (id) {
      getEvent(id).then((e) => {
        setEvent(e);
        setLoading(false);
      });
    }
  }, [id]);

  async function handleUpdate(data: {
    title: string;
    type: EventType;
    eventDate: Date;
    location: string;
    maxParticipants: number;
    registrationOpensAt: Date;
  }) {
    if (!user || !id) return;
    setSaving(true);
    try {
      await updateEvent(id, data, user.uid);
      Alert.alert('Sucesso', 'Evento atualizado!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenList() {
    if (!user || !id) return;
    setOpeningList(true);
    try {
      await updateEvent(id, { status: 'open' }, user.uid);
      setEvent((prev) => prev ? { ...prev, status: 'open' } : prev);
      Alert.alert('Lista aberta!', 'Os membros já podem se inscrever.');
    } catch (err: unknown) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao abrir lista');
    } finally {
      setOpeningList(false);
    }
  }

  async function confirmCancel() {
    if (!user || !id) return;
    if (!cancelReason.trim()) {
      Alert.alert('Erro', 'Informe o motivo do cancelamento');
      return;
    }

    setSaving(true);
    setShowCancelModal(false);
    try {
      await cancelEvent(id, user.uid, cancelReason.trim());
      Alert.alert('Evento cancelado', 'Os participantes serão notificados.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao cancelar');
    } finally {
      setSaving(false);
      setCancelReason('');
    }
  }

  if (loading || !event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <LoadingSpinner fullScreen />
      </SafeAreaView>
    );
  }

  const isCancelled = event.status === 'cancelled';

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

          <Text variant="h3" weight="bold" style={styles.title}>Editar evento</Text>

          {/* Mostra motivo do cancelamento se já cancelado */}
          {isCancelled && event.cancellationReason && (
            <Card variant="outlined" padding={Spacing[4]} style={styles.cancelledCard}>
              <Badge variant="error" label="Evento cancelado" />
              <Text variant="body" color="muted" style={styles.cancelReason}>
                Motivo: {event.cancellationReason}
              </Text>
            </Card>
          )}

          <EventForm
            initialEvent={event}
            onSubmit={handleUpdate}
            submitLabel="Salvar alterações"
            loading={saving}
          />

          {event.status === 'upcoming' && (
            <Button
              label="Abrir lista agora"
              variant="primary"
              size="lg"
              fullWidth
              loading={openingList}
              onPress={handleOpenList}
              style={styles.cancelBtn}
            />
          )}

          {event.status !== 'cancelled' && event.status !== 'finished' && (
            <Button
              label="Cancelar evento"
              variant="danger"
              size="lg"
              fullWidth
              loading={saving}
              onPress={() => setShowCancelModal(true)}
              style={styles.cancelBtn}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal para motivo do cancelamento */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCancelModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, { backgroundColor: theme.background.elevated }]}
          >
            <Text variant="h4" weight="bold">Cancelar evento</Text>
            <Text variant="body" color="muted" style={styles.modalSubtitle}>
              Informe o motivo. Os participantes serão notificados.
            </Text>

            <Input
              label="Motivo do cancelamento"
              placeholder="Ex: Quadra indisponível, chuva forte..."
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
              style={styles.reasonInput}
            />

            <View style={styles.modalActions}>
              <Button
                label="Voltar"
                variant="ghost"
                size="md"
                onPress={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
              />
              <Button
                label="Confirmar cancelamento"
                variant="danger"
                size="md"
                loading={saving}
                onPress={confirmCancel}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    marginTop: Spacing[2],
    marginBottom: Spacing[3],
  },
  cancelBtn: {
    marginTop: Spacing[6],
  },
  cancelledCard: {
    marginBottom: Spacing[4],
    gap: Spacing[2],
    alignItems: 'flex-start',
  },
  cancelReason: {
    marginTop: Spacing[1],
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: Spacing[4],
  },
  modalContent: {
    borderRadius: BorderRadius.lg,
    padding: Spacing[5],
    gap: Spacing[3],
  },
  modalSubtitle: {
    marginBottom: Spacing[1],
  },
  reasonInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing[2],
    marginTop: Spacing[2],
  },
});

import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, Modal, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { useEventStore } from '@/stores/eventStore';
import { useEventDetailStore } from '@/stores/eventDetailStore';
import { registerForEvent, cancelRegistration } from '@/services/registrationService';
import { scheduleEventReminders, cancelEventReminders } from '@/services/notificationService';
import { getUserPublicProfile } from '@/services/userService';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ParticipantList } from '@/components/events/ParticipantList';
import { PrimeCaptainPanel } from '@/components/events/PrimeCaptainPanel';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { formatEventDate, formatEventTime, formatOpeningCountdown, isListOpen } from '@/utils/dateUtils';
import { EVENT_TYPE_LABELS } from '@/types/event.types';
import { PLAYER_POSITION_LABELS, type PlayerPosition } from '@/types/user.types';
import type { Registration } from '@/types/registration.types';

interface PublicProfile {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  position?: PlayerPosition;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { getUserRegistrationForEvent } = useEventStore();
  const { event, isLoading, getConfirmed, getWaitlist, startListening, stopListening } =
    useEventDetailStore();

  const [actionLoading, setActionLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{ reg: Registration; profile: PublicProfile | null } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const handleSelectParticipant = useCallback(async (reg: Registration) => {
    setSelectedProfile({ reg, profile: null });
    setProfileLoading(true);
    try {
      const profile = await getUserPublicProfile(reg.userId);
      setSelectedProfile({ reg, profile });
    } catch {
      setSelectedProfile({ reg, profile: null });
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      startListening(id);
      return () => stopListening();
    }
  }, [id]);

  const userReg = id ? getUserRegistrationForEvent(id) : undefined;
  const confirmed = getConfirmed();
  const waitlist = getWaitlist();

  if (isLoading || !event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <LoadingSpinner fullScreen />
      </SafeAreaView>
    );
  }

  const vacancyPercent = event.maxParticipants > 0
    ? Math.min((event.confirmedCount / event.maxParticipants) * 100, 100)
    : 0;

  // Status efetivo: se 'upcoming' mas horário de abertura já passou, trata como 'open'
  const effectiveStatus =
    event.status === 'upcoming' && isListOpen(event.registrationOpensAt)
      ? 'open'
      : event.status;

  const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral' }> = {
    open: { label: 'Lista aberta', variant: 'success' },
    upcoming: { label: 'Em breve', variant: 'neutral' },
    full: { label: 'Lotado', variant: 'error' },
    in_progress: { label: 'Acontecendo agora', variant: 'accent' },
    finished: { label: 'Encerrado', variant: 'neutral' },
    cancelled: { label: 'Cancelado', variant: 'error' },
  };

  const statusInfo = statusConfig[effectiveStatus] ?? { label: effectiveStatus, variant: 'neutral' as const };

  async function handleRegister() {
    if (!user || !id || !event) return;
    setActionLoading(true);
    try {
      await registerForEvent({
        eventId: id,
        userId: user.uid,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        playerPosition: user.position,
      });
      scheduleEventReminders(id, event.eventDate, event.title).catch(() => {});
    } catch (err: unknown) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao se inscrever');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!user || !id) return;
    Alert.alert(
      'Cancelar inscrição',
      'Tem certeza que deseja sair deste evento?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, cancelar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await cancelRegistration(id, user.uid);
              cancelEventReminders(id).catch(() => {});
            } catch (err: unknown) {
              Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao cancelar');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header com voltar */}
        <View style={styles.topBar}>
          <Button
            label="← Voltar"
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
          />
          <Badge variant={statusInfo.variant} label={statusInfo.label} />
        </View>

        {/* Info do evento */}
        <View style={styles.info}>
          <Badge variant="accent" size="sm" label={EVENT_TYPE_LABELS[event.type]} />
          <Text variant="h2" weight="bold" style={styles.title}>{event.title}</Text>
          <Text variant="body" color="secondary">
            📅  {formatEventDate(event.eventDate)} às {formatEventTime(event.eventDate)}
          </Text>
          <Text variant="body" color="secondary">📍  {event.location}</Text>
        </View>

        <Divider spacing={Spacing[4]} />

        {/* Barra de vagas */}
        <View style={styles.vacancyRow}>
          <Text variant="caption" weight="semibold" color="muted">Vagas</Text>
          <View style={[styles.progressBar, { backgroundColor: theme.background.elevated }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${vacancyPercent}%`,
                  backgroundColor: vacancyPercent >= 100
                    ? theme.status.error
                    : theme.accent.primary,
                },
              ]}
            />
          </View>
          <Text variant="caption" weight="semibold" color="muted">
            {event.confirmedCount}/{event.maxParticipants}
          </Text>
        </View>
        {event.waitlistCount > 0 && (
          <Text variant="caption" color="warning" style={styles.waitlistInfo}>
            {event.waitlistCount} na lista de espera
          </Text>
        )}

        {/* Ação de inscrição */}
        <View style={styles.actionSection}>
          {effectiveStatus === 'upcoming' && (
            <Card variant="default" padding={Spacing[4]}>
              <Text variant="body" color="muted" style={styles.countdownText}>
                {formatOpeningCountdown(event.registrationOpensAt)}
              </Text>
            </Card>
          )}

          {effectiveStatus === 'open' && !userReg && (
            <Button
              label="Inscrever-se"
              variant="primary"
              size="lg"
              fullWidth
              loading={actionLoading}
              onPress={handleRegister}
            />
          )}

          {userReg?.status === 'confirmed' && (
            <Badge variant="success" label="✓ Confirmado" />
          )}

          {userReg?.status === 'waitlist' && (
            <Badge variant="warning" label={`Lista de espera #${userReg.waitlistPosition}`} />
          )}

          {effectiveStatus === 'full' && !userReg && (
            <Card variant="default" padding={Spacing[4]}>
              <Text variant="body" color="muted" style={styles.countdownText}>
                Evento lotado. Fique de olho caso alguém desista!
              </Text>
            </Card>
          )}

          {effectiveStatus === 'finished' && (
            <Card variant="default" padding={Spacing[4]}>
              <Text variant="body" color="muted" style={styles.countdownText}>
                Evento encerrado
              </Text>
            </Card>
          )}

          {effectiveStatus === 'cancelled' && (
            <Card variant="outlined" padding={Spacing[4]}>
              <Text variant="body" color="error" weight="semibold">
                Evento cancelado
              </Text>
              {event.cancellationReason && (
                <Text variant="body" color="muted" style={styles.cancelReason}>
                  Motivo: {event.cancellationReason}
                </Text>
              )}
            </Card>
          )}
        </View>

        <Divider spacing={Spacing[4]} />

        {/* Para eventos Prime com usuário confirmado (capitã): painel de time */}
        {event.type === 'prime' && user && userReg?.status === 'confirmed' ? (
          <PrimeCaptainPanel
            eventId={event.id}
            eventTitle={event.title}
            captainId={user.uid}
            captainDisplayName={user.displayName}
            captainAvatarUrl={user.avatarUrl}
          />
        ) : (
          /* Lista de participantes padrão */
          <>
            <ParticipantList
              title={event.type === 'prime' ? 'Capitões inscritos' : 'Confirmados'}
              registrations={confirmed}
              emptyMessage="Nenhum inscrito ainda"
              onPressParticipant={handleSelectParticipant}
            />

            {waitlist.length > 0 && (
              <View style={styles.waitlistSection}>
                <ParticipantList
                  title="Lista de espera"
                  registrations={waitlist}
                  showWaitlistPosition
                  onPressParticipant={handleSelectParticipant}
                />
              </View>
            )}
          </>
        )}

        {/* Cancelar ao final, discreto */}
        {userReg && (userReg.status === 'confirmed' || userReg.status === 'waitlist') && (
          <>
            <Divider spacing={Spacing[6]} />
            <Button
              label={userReg.status === 'waitlist' ? 'Sair da lista de espera' : 'Cancelar inscrição'}
              variant="danger-ghost"
              size="md"
              fullWidth
              loading={actionLoading}
              onPress={handleCancel}
            />
          </>
        )}
      </ScrollView>

      {/* Modal do participante */}
      <Modal
        visible={selectedProfile !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedProfile(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedProfile(null)}>
          <Pressable style={[styles.profileCard, { backgroundColor: theme.background.elevated }]}>
            {profileLoading || !selectedProfile ? (
              <LoadingSpinner />
            ) : (
              <View style={styles.profileCardContent}>
                <Avatar
                  uri={selectedProfile.profile?.avatarUrl ?? selectedProfile.reg.avatarUrl}
                  name={selectedProfile.reg.displayName}
                  size="xl"
                  position={selectedProfile.profile?.position}
                  showPositionBadge={!!selectedProfile.profile?.position}
                />
                <Text variant="h4" weight="bold" style={styles.profileName}>
                  {selectedProfile.reg.displayName}
                </Text>
                {selectedProfile.profile?.position && (
                  <Badge
                    variant="accent"
                    size="md"
                    label={PLAYER_POSITION_LABELS[selectedProfile.profile.position]}
                  />
                )}
              </View>
            )}
            <Button
              label="Fechar"
              variant="ghost"
              size="md"
              onPress={() => setSelectedProfile(null)}
              style={styles.closeBtn}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[10],
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[3],
  },
  info: {
    gap: Spacing[2],
    marginTop: Spacing[2],
  },
  title: {
    marginTop: Spacing[1],
  },
  vacancyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  waitlistInfo: {
    marginTop: Spacing[1],
  },
  actionSection: {
    marginTop: Spacing[4],
  },
  registeredSection: {
    gap: Spacing[3],
    alignItems: 'flex-start',
  },
  countdownText: {
    textAlign: 'center',
  },
  waitlistSection: {
    marginTop: Spacing[5],
  },
  cancelReason: {
    marginTop: Spacing[1],
  },

  // Modal participante
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
  },
  profileCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing[6],
    gap: Spacing[4],
    alignItems: 'center',
  },
  profileCardContent: {
    alignItems: 'center',
    gap: Spacing[3],
    width: '100%',
  },
  profileName: {
    marginTop: Spacing[1],
  },
  closeBtn: {
    alignSelf: 'stretch',
  },
});

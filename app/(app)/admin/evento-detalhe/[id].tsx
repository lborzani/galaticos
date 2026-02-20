import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { useEventStore } from '@/stores/eventStore';
import { useTeamStore } from '@/stores/teamStore';
import { subscribeToEventRegistrations } from '@/services/registrationService';
import { getUserPublicProfile } from '@/services/userService';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Divider } from '@/components/ui/Divider';
import { PrimeTeamsView } from '@/components/events/PrimeTeamsView';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { formatEventDate, formatEventTime } from '@/utils/dateUtils';
import { EVENT_TYPE_LABELS } from '@/types/event.types';
import { PLAYER_POSITION_LABELS, type PlayerPosition } from '@/types/user.types';
import type { Registration } from '@/types/registration.types';
import type { Unsubscribe } from 'firebase/firestore';

const STATUS_CONFIG = {
  confirmed: { label: 'Confirmado', variant: 'success' as const },
  waitlist: { label: 'Lista de espera', variant: 'neutral' as const },
  attended: { label: 'Presente', variant: 'accent' as const },
  cancelled: { label: 'Cancelado', variant: 'error' as const },
};

interface PublicProfile {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  position?: PlayerPosition;
}

export default function EventoDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { events } = useEventStore();
  const { startListening: startTeamsListening, stopListening: stopTeamsListening } = useTeamStore();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<{ reg: Registration; profile: PublicProfile | null } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const event = events.find((e) => e.id === id);
  const isPrime = event?.type === 'prime';

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const unsub: Unsubscribe = subscribeToEventRegistrations(id, (regs) => {
      setRegistrations(regs);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  // Inicia listener de times para eventos Prime
  useEffect(() => {
    if (!id || !isPrime) return;
    startTeamsListening(id);
    return () => stopTeamsListening();
  }, [id, isPrime]);

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

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <LoadingSpinner fullScreen />
      </SafeAreaView>
    );
  }

  const confirmed = registrations.filter((r) => r.status === 'confirmed' || r.status === 'attended');
  const waitlist = registrations.filter((r) => r.status === 'waitlist');
  const attendedCount = registrations.filter((r) => r.status === 'attended').length;
  const isCancelled = event.status === 'cancelled';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Voltar */}
        <Button
          label="← Voltar"
          variant="ghost"
          size="sm"
          onPress={() => router.back()}
          style={styles.back}
        />

        {/* Info do evento */}
        <View style={styles.eventHeader}>
          <View style={styles.eventBadges}>
            <Badge variant="accent" size="sm" label={EVENT_TYPE_LABELS[event.type]} />
            {isCancelled && <Badge variant="error" size="sm" label="Cancelado" />}
          </View>
          <Text variant="h3" weight="bold" style={styles.eventTitle}>
            {event.title}
          </Text>
          <Text variant="body" color="muted">
            {formatEventDate(event.eventDate)} · {formatEventTime(event.eventDate)}
          </Text>
          <Text variant="body" color="muted">
            {event.location}
          </Text>
        </View>

        {/* Estatísticas */}
        <View style={[styles.statsRow, { backgroundColor: theme.background.elevated, borderColor: theme.background.border }]}>
          <StatItem label="Vagas" value={`${event.confirmedCount}/${event.maxParticipants}`} color={theme.accent.primary} />
          <View style={[styles.statDivider, { backgroundColor: theme.background.border }]} />
          <StatItem label="Espera" value={String(event.waitlistCount)} color={theme.text.secondary} />
          <View style={[styles.statDivider, { backgroundColor: theme.background.border }]} />
          <StatItem label="Presentes" value={String(attendedCount)} color={theme.status.success} />
        </View>

        {/* Ações */}
        {!isCancelled && (
          <View style={styles.actions}>
            <Button
              label="Scanner QR"
              variant="primary"
              size="md"
              style={styles.actionBtn}
              onPress={() => router.push('/(app)/admin/scanner')}
            />
            <Button
              label="Editar evento"
              variant="ghost"
              size="md"
              style={styles.actionBtn}
              onPress={() => router.push(`/(app)/admin/evento-edit/${event.id}`)}
            />
          </View>
        )}

        {isCancelled && (
          <Button
            label="Editar / Ver motivo"
            variant="ghost"
            size="md"
            fullWidth
            style={styles.editCancelled}
            onPress={() => router.push(`/(app)/admin/evento-edit/${event.id}`)}
          />
        )}

        <Divider spacing={Spacing[4]} />

        {/* Lista */}
        {loading ? (
          <LoadingSpinner />
        ) : isPrime ? (
          /* ——— Visão Prime: times em tempo real ——— */
          <>
            <Text variant="label" weight="semibold" color="muted" style={styles.listLabel}>
              TIMES ({confirmed.length}/3 capitões)
            </Text>
            <PrimeTeamsView captains={confirmed} />

            {waitlist.length > 0 && (
              <>
                <Text variant="label" weight="semibold" color="muted" style={[styles.listLabel, styles.listLabelSpaced]}>
                  LISTA DE ESPERA ({waitlist.length})
                </Text>
                {waitlist.map((reg) => (
                  <ParticipantRow
                    key={reg.id}
                    registration={reg}
                    onPress={() => handleSelectParticipant(reg)}
                  />
                ))}
              </>
            )}
          </>
        ) : (
          /* ——— Visão padrão: lista de inscritos ——— */
          <>
            <Text variant="label" weight="semibold" color="muted" style={styles.listLabel}>
              CONFIRMADOS ({confirmed.length})
            </Text>

            {confirmed.length === 0 ? (
              <Text variant="caption" color="muted" style={styles.emptyList}>
                Nenhuma inscrição confirmada ainda.
              </Text>
            ) : (
              confirmed.map((reg) => (
                <ParticipantRow
                  key={reg.id}
                  registration={reg}
                  onPress={() => handleSelectParticipant(reg)}
                />
              ))
            )}

            {waitlist.length > 0 && (
              <>
                <Text variant="label" weight="semibold" color="muted" style={[styles.listLabel, styles.listLabelSpaced]}>
                  LISTA DE ESPERA ({waitlist.length})
                </Text>
                {waitlist.map((reg) => (
                  <ParticipantRow
                    key={reg.id}
                    registration={reg}
                    onPress={() => handleSelectParticipant(reg)}
                  />
                ))}
              </>
            )}
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
              <ProfileCardContent
                registration={selectedProfile.reg}
                profile={selectedProfile.profile}
              />
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

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statItem}>
      <Text variant="h3" weight="bold" style={{ color }}>{value}</Text>
      <Text variant="caption" color="muted">{label}</Text>
    </View>
  );
}

function ParticipantRow({
  registration,
  onPress,
}: {
  registration: Registration;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const config = STATUS_CONFIG[registration.status] ?? { label: registration.status, variant: 'neutral' as const };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.participantRow, { borderColor: theme.background.border }]}
    >
      <Avatar
        uri={registration.avatarUrl}
        name={registration.displayName}
        size="sm"
      />
      <View style={styles.participantInfo}>
        <Text variant="body" weight="medium">{registration.displayName}</Text>
        <Text variant="caption" color="muted">#{registration.position}</Text>
      </View>
      <Badge variant={config.variant} size="sm" label={config.label} />
    </TouchableOpacity>
  );
}

function ProfileCardContent({
  registration,
  profile,
}: {
  registration: Registration;
  profile: PublicProfile | null;
}) {
  const { theme } = useTheme();
  const config = STATUS_CONFIG[registration.status] ?? { label: registration.status, variant: 'neutral' as const };
  const position = profile?.position;

  return (
    <View style={styles.profileCardContent}>
      <Avatar
        uri={profile?.avatarUrl ?? registration.avatarUrl}
        name={registration.displayName}
        size="xl"
        position={position}
        showPositionBadge={!!position}
      />
      <Text variant="h4" weight="bold" style={styles.profileName}>
        {registration.displayName}
      </Text>
      {position && (
        <Badge variant="accent" size="md" label={PLAYER_POSITION_LABELS[position]} />
      )}
      <View style={styles.profileMeta}>
        <Badge variant={config.variant} size="sm" label={config.label} />
        <Text variant="caption" color="muted">Posição #{registration.position}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[10],
  },
  back: {
    alignSelf: 'flex-start',
    marginTop: Spacing[2],
  },

  eventHeader: {
    marginTop: Spacing[3],
    gap: Spacing[1],
  },
  eventBadges: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  eventTitle: {
    marginBottom: Spacing[1],
  },

  statsRow: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing[5],
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[4],
    gap: Spacing[1],
  },
  statDivider: {
    width: 1,
  },

  actions: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginTop: Spacing[4],
  },
  actionBtn: {
    flex: 1,
  },
  editCancelled: {
    marginTop: Spacing[4],
  },

  listLabel: {
    letterSpacing: 0.6,
    marginBottom: Spacing[3],
  },
  listLabelSpaced: {
    marginTop: Spacing[6],
  },
  emptyList: {
    marginBottom: Spacing[4],
  },

  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    gap: Spacing[3],
  },
  participantInfo: {
    flex: 1,
    gap: 2,
  },

  // Modal
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
  profileMeta: {
    flexDirection: 'row',
    gap: Spacing[3],
    alignItems: 'center',
    marginTop: Spacing[1],
  },
  closeBtn: {
    alignSelf: 'stretch',
  },
});

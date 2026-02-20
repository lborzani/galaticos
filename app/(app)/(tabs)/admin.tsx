import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { useEventStore } from '@/stores/eventStore';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { formatEventDate, formatEventTime } from '@/utils/dateUtils';
import type { Event } from '@/types/event.types';

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'accent' | 'neutral' }> = {
  open: { label: 'Aberto', variant: 'success' },
  upcoming: { label: 'Em breve', variant: 'neutral' },
  full: { label: 'Lotado', variant: 'warning' },
  in_progress: { label: 'Em andamento', variant: 'accent' },
  finished: { label: 'Encerrado', variant: 'neutral' },
  cancelled: { label: 'Cancelado', variant: 'error' },
};

function EventCard({ event, onPress }: { event: Event; onPress: () => void }) {
  const { theme } = useTheme();
  const badge = STATUS_BADGE[event.status] ?? { label: event.status, variant: 'neutral' as const };
  const fillRatio = Math.min(event.confirmedCount / event.maxParticipants, 1);
  const isFull = event.confirmedCount >= event.maxParticipants;

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
      <View style={[styles.card, { backgroundColor: theme.background.elevated, borderColor: theme.background.border }]}>
        {/* Topo: título + status */}
        <View style={styles.cardTop}>
          <Text variant="body" weight="semibold" style={styles.cardTitle} numberOfLines={1}>
            {event.title}
          </Text>
          <Badge variant={badge.variant} size="sm" label={badge.label} />
        </View>

        {/* Data e local */}
        <Text variant="caption" color="muted" style={styles.cardMeta}>
          {formatEventDate(event.eventDate)} · {formatEventTime(event.eventDate)}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {event.location}
        </Text>

        {/* Barra de progresso de vagas */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: theme.background.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${fillRatio * 100}%` as `${number}%`,
                  backgroundColor: isFull ? theme.status.warning : theme.accent.primary,
                },
              ]}
            />
          </View>
          <Text variant="caption" color="secondary" style={styles.progressLabel}>
            {event.confirmedCount}/{event.maxParticipants}
            {event.waitlistCount > 0 && (
              <Text variant="caption" color="muted"> · {event.waitlistCount} espera</Text>
            )}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PastEventCard({ event, onPress }: { event: Event; onPress: () => void }) {
  const { theme } = useTheme();
  const badge = STATUS_BADGE[event.status] ?? { label: event.status, variant: 'neutral' as const };

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
      <View style={[styles.pastCard, { backgroundColor: theme.background.secondary, borderColor: theme.background.border }]}>
        <View style={styles.cardTop}>
          <Text variant="caption" weight="medium" style={styles.cardTitle} numberOfLines={1}>
            {event.title}
          </Text>
          <Badge variant={badge.variant} size="sm" label={badge.label} />
        </View>
        <Text variant="caption" color="muted">
          {formatEventDate(event.eventDate)} · {event.confirmedCount} presentes
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AdminDashboardScreen() {
  const { theme } = useTheme();
  const { getUpcomingEvents, getPastEvents } = useEventStore();

  const upcoming = getUpcomingEvents();
  const past = getPastEvents();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="h3" weight="bold">Painel Admin</Text>
            <Text variant="caption" color="muted">Gerencie os eventos do time</Text>
          </View>
          <View style={styles.headerActions}>
            <Button
              label="Scanner"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/(app)/admin/scanner')}
            />
            <Button
              label="+ Novo"
              variant="primary"
              size="sm"
              onPress={() => router.push('/(app)/admin/evento-form')}
            />
          </View>
        </View>

        {/* Próximos */}
        <Text variant="label" weight="semibold" color="muted" style={styles.sectionLabel}>
          PRÓXIMOS EVENTOS
        </Text>

        {upcoming.length === 0 ? (
          <EmptyState
            title="Nenhum evento agendado"
            description="Crie um novo evento para o time."
          />
        ) : (
          upcoming.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => router.push(`/(app)/admin/evento-detalhe/${event.id}`)}
            />
          ))
        )}

        {/* Passados */}
        {past.length > 0 && (
          <>
            <Text variant="label" weight="semibold" color="muted" style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
              EVENTOS ANTERIORES
            </Text>
            {past.slice(0, 5).map((event) => (
              <PastEventCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/(app)/admin/evento-detalhe/${event.id}`)}
              />
            ))}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[8],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing[5],
    paddingBottom: Spacing[4],
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing[2],
    alignItems: 'center',
  },
  sectionLabel: {
    marginBottom: Spacing[3],
    letterSpacing: 0.6,
  },
  sectionLabelSpaced: {
    marginTop: Spacing[6],
  },

  // Card de evento próximo
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    gap: Spacing[1],
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[1],
  },
  cardTitle: {
    flex: 1,
    marginRight: Spacing[2],
  },
  cardMeta: {
    marginTop: Spacing[1],
  },

  // Barra de progresso
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: Spacing[3],
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: BorderRadius.full,
  },
  progressLabel: {
    minWidth: 60,
    textAlign: 'right',
  },

  // Card de evento passado
  pastCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    marginBottom: Spacing[2],
    gap: Spacing[1],
  },
});

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Divider } from '@/components/ui/Divider';
import { Spacing } from '@/constants/spacing';
import { formatEventDate, formatEventTime, formatOpeningCountdown, capitalizeFirst } from '@/utils/dateUtils';
import type { Event, EventStatus } from '@/types/event.types';

interface EventCardProps {
  event: Event;
  isRegistered?: boolean;
  waitlistPosition?: number;
}

function statusBadge(status: EventStatus, confirmedCount: number, maxParticipants: number) {
  switch (status) {
    case 'open':
      return confirmedCount < maxParticipants
        ? { label: 'Lista aberta', variant: 'success' as const }
        : { label: 'Lista de espera', variant: 'warning' as const };
    case 'upcoming':
      return { label: 'Em breve', variant: 'neutral' as const };
    case 'full':
      return { label: 'Lotado', variant: 'error' as const };
    case 'in_progress':
      return { label: 'Acontecendo agora', variant: 'accent' as const };
    case 'finished':
      return { label: 'Encerrado', variant: 'neutral' as const };
    case 'cancelled':
      return { label: 'Cancelado', variant: 'error' as const };
  }
}

export function EventCard({ event, isRegistered, waitlistPosition }: EventCardProps) {
  const { theme } = useTheme();

  const badge = statusBadge(event.status, event.confirmedCount, event.maxParticipants);
  const vacancies = event.maxParticipants - event.confirmedCount;
  const isCancelled = event.status === 'cancelled';
  const isFinished = event.status === 'finished';
  const isOpen = event.status === 'open';
  const cardVariant = isRegistered ? 'accent' : 'default';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/(app)/evento/${event.id}`)}
      disabled={isCancelled}
    >
      <Card
        variant={cardVariant}
        style={[
          styles.card,
          (isCancelled || isFinished) && styles.dimmed,
        ]}
      >
        {/* Linha superior: tipo e status */}
        <View style={styles.topRow}>
          <Text variant="caption" color="muted" weight="medium">
            {capitalizeFirst(formatEventDate(event.eventDate))}
          </Text>
          <Badge label={badge.label} variant={badge.variant} />
        </View>

        {/* Título */}
        <Text
          variant="h4"
          weight="bold"
          style={[
            styles.title,
            (isCancelled || isFinished) && { opacity: 0.5 },
          ]}
        >
          {event.title}
        </Text>

        {/* Local e horário */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <RNText style={styles.infoEmoji}>🕐</RNText>
            <Text variant="label" color="secondary">{formatEventTime(event.eventDate)}</Text>
          </View>
          {event.location ? (
            <View style={styles.infoItem}>
              <RNText style={styles.infoEmoji}>📍</RNText>
              <Text variant="label" color="secondary">{event.location}</Text>
            </View>
          ) : null}
        </View>

        <Divider spacing={Spacing[3]} />

        {/* Linha inferior: vagas e status do usuário */}
        <View style={styles.bottomRow}>
          {/* Contagem de vagas */}
          <View style={styles.vacancyRow}>
            <View
              style={[
                styles.vacancyBar,
                { backgroundColor: theme.background.elevated },
              ]}
            >
              <View
                style={[
                  styles.vacancyFill,
                  {
                    backgroundColor: vacancies > 0 ? theme.status.success : theme.status.error,
                    width: `${Math.min((event.confirmedCount / event.maxParticipants) * 100, 100)}%`,
                  },
                ]}
              />
            </View>
            <Text variant="caption" color="secondary">
              {event.confirmedCount}/{event.maxParticipants} confirmados
            </Text>
          </View>

          {/* Status do usuário */}
          {isRegistered && (
            <Badge
              label={waitlistPosition ? `Espera #${waitlistPosition}` : '✓ Inscrito'}
              variant={waitlistPosition ? 'warning' : 'success'}
              size="sm"
            />
          )}
        </View>

        {/* Countdown da abertura */}
        {event.status === 'upcoming' && (
          <Text variant="caption" color="muted" style={styles.countdown}>
            {formatOpeningCountdown(event.registrationOpensAt)}
          </Text>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing[4],
  },
  dimmed: {
    opacity: 0.6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  title: {
    marginBottom: Spacing[2],
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing[4],
    marginBottom: Spacing[1],
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoEmoji: {
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[2],
  },
  vacancyRow: {
    flex: 1,
    gap: Spacing[1],
  },
  vacancyBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  vacancyFill: {
    height: '100%',
    borderRadius: 3,
  },
  countdown: {
    marginTop: Spacing[3],
    textAlign: 'right',
  },
});

import { View, ScrollView, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { useEventStore } from '@/stores/eventStore';
import { useInboxStore } from '@/stores/inboxStore';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EventCard } from '@/components/events/EventCard';
import { Spacing, BorderRadius } from '@/constants/spacing';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const pendingCount = useInboxStore((s) => s.getPendingCount());
  const {
    isLoading,
    getUpcomingEvents,
    getPastEvents,
    getUserRegistrationForEvent,
  } = useEventStore();

  const upcomingEvents = getUpcomingEvents();
  const pastEvents = getPastEvents();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background.primary }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.greeting}>
            <Text variant="caption" color="muted">
              Bem-vindo de volta,
            </Text>
            <View style={styles.greetingName}>
              <Text variant="h3" weight="bold">
                {user?.displayName?.split(' ')[0] ?? 'Jogador'}
              </Text>
              <RNText style={styles.greetingEmoji}>👋</RNText>
            </View>
          </View>
          <Avatar
            name={user?.displayName ?? ''}
            uri={user?.avatarUrl}
            size="md"
            position={user?.position}
            showPositionBadge={!!user?.position}
          />
        </View>

        <Divider spacing={Spacing[2]} />

        {/* Banner de convites pendentes */}
        {pendingCount > 0 && (
          <TouchableOpacity
            style={[styles.inboxBanner, { backgroundColor: theme.background.elevated, borderColor: theme.accent.primary }]}
            activeOpacity={0.8}
            onPress={() => router.push('/(app)/inbox')}
          >
            <View style={styles.inboxBannerContent}>
              <View style={styles.bannerTitle}>
                <RNText style={styles.bannerEmoji}>📬</RNText>
                <Text variant="body" weight="semibold">Convites de time</Text>
              </View>
              <Text variant="caption" color="muted">
                Você tem {pendingCount} convite{pendingCount > 1 ? 's' : ''} pendente{pendingCount > 1 ? 's' : ''}
              </Text>
            </View>
            <Badge variant="accent" size="sm" label={String(pendingCount)} />
          </TouchableOpacity>
        )}

        {isLoading ? (
          <LoadingSpinner label="Carregando eventos..." />
        ) : (
          <>
            {/* Próximos eventos */}
            <View style={styles.section}>
              <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
                Próximos eventos
              </Text>

              {upcomingEvents.length === 0 ? (
                <EmptyState
                  title="Nenhum evento agendado"
                  description="Quando o admin criar novos eventos, eles aparecerão aqui."
                />
              ) : (
                upcomingEvents.map((event) => {
                  const reg = getUserRegistrationForEvent(event.id);
                  return (
                    <EventCard
                      key={event.id}
                      event={event}
                      isRegistered={!!reg}
                      waitlistPosition={reg?.waitlistPosition}
                    />
                  );
                })
              )}
            </View>

            {/* Eventos passados */}
            {pastEvents.length > 0 && (
              <View style={styles.section}>
                <Text variant="label" color="muted" weight="medium" style={styles.sectionTitle}>
                  Eventos anteriores
                </Text>
                {pastEvents.slice(0, 5).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
                {pastEvents.length > 5 && (
                  <Text variant="caption" color="muted" style={styles.sliceNote}>
                    Exibindo os 5 eventos mais recentes
                  </Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[8],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing[5],
  },
  greeting: {
    gap: Spacing[1],
  },
  greetingName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  greetingEmoji: {
    fontSize: 22,
  },
  section: {
    marginTop: Spacing[5],
  },
  sectionTitle: {
    marginBottom: Spacing[3],
  },
  inboxBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginTop: Spacing[3],
    marginBottom: 0,
  },
  inboxBannerContent: {
    flex: 1,
    gap: Spacing[1],
  },
  bannerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  bannerEmoji: {
    fontSize: 14,
  },
  sliceNote: {
    textAlign: 'center',
    marginTop: Spacing[2],
  },
});

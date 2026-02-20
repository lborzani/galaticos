import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { useEventStore } from '@/stores/eventStore';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { formatEventDate, formatEventTime } from '@/utils/dateUtils';
import { EVENT_TYPE_LABELS } from '@/types/event.types';

export default function PassaporteScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { events, userRegistrations } = useEventStore();

  // Apenas inscrições confirmadas em eventos futuros/abertos
  const activePassports = userRegistrations
    .filter((r) => r.status === 'confirmed')
    .map((r) => {
      const event = events.find((e) => e.id === r.eventId);
      return event ? { registration: r, event } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .filter(({ event }) => event.status !== 'finished' && event.status !== 'cancelled')
    .sort((a, b) => a.event.eventDate.getTime() - b.event.eventDate.getTime());

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={styles.header}>
        <Text variant="h3" weight="bold">Meu Passaporte</Text>
      </View>

      {activePassports.length === 0 ? (
        <EmptyState
          title="Nenhum passaporte ativo"
          description="Quando você se inscrever em um evento, seu passaporte com QR Code aparecerá aqui."
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {activePassports.map(({ registration, event }) => {
            // QR data = registration ID (único, verificável pelo admin)
            const qrData = registration.passportQrData ?? registration.id;

            return (
              <View
                key={registration.id}
                style={[styles.ticket, { backgroundColor: theme.background.elevated, borderColor: theme.background.border }]}
              >
                {/* Cabeçalho do ticket */}
                <View style={styles.ticketHeader}>
                  <Badge variant="accent" size="sm" label={EVENT_TYPE_LABELS[event.type]} />
                  <Badge variant="success" label="✓ Confirmado" />
                </View>

                <Text variant="h3" weight="bold" style={styles.eventTitle}>
                  {event.title}
                </Text>

                <View style={styles.eventInfo}>
                  <Text variant="body" color="secondary">
                    📅  {formatEventDate(event.eventDate)} às {formatEventTime(event.eventDate)}
                  </Text>
                  <Text variant="body" color="secondary">
                    📍  {event.location}
                  </Text>
                </View>

                {/* Separador estilo ticket */}
                <View style={styles.perforationRow}>
                  <View style={[styles.perforationCircle, { backgroundColor: theme.background.primary }]} />
                  <View style={[styles.perforationLine, { borderColor: theme.background.border }]} />
                  <View style={[styles.perforationCircle, { backgroundColor: theme.background.primary }]} />
                </View>

                {/* QR Code */}
                <View style={styles.qrSection}>
                  <View style={[styles.qrWrapper, { backgroundColor: '#FFFFFF' }]}>
                    <QRCode
                      value={qrData}
                      size={200}
                      color="#000000"
                      backgroundColor="#FFFFFF"
                    />
                  </View>

                  <Text variant="label" weight="semibold" style={styles.userName}>
                    {user?.displayName}
                  </Text>
                  <Text variant="caption" color="muted">
                    #{registration.position} · Apresente na entrada
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[5],
  },
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[10],
    gap: Spacing[6],
  },
  ticket: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },
  eventTitle: {
    paddingHorizontal: Spacing[4],
    marginTop: Spacing[3],
  },
  eventInfo: {
    paddingHorizontal: Spacing[4],
    marginTop: Spacing[2],
    gap: Spacing[1],
    paddingBottom: Spacing[4],
  },
  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  perforationCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginHorizontal: -12,
    zIndex: 1,
  },
  perforationLine: {
    flex: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  qrSection: {
    alignItems: 'center',
    paddingVertical: Spacing[5],
    gap: Spacing[3],
  },
  qrWrapper: {
    padding: Spacing[3],
    borderRadius: BorderRadius.md,
  },
  userName: {
    marginTop: Spacing[1],
  },
});

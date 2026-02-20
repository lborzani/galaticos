import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Spacing } from '@/constants/spacing';
import { PLAYER_POSITION_LABELS } from '@/types/user.types';
import type { Registration } from '@/types/registration.types';

interface ParticipantListProps {
  registrations: Registration[];
  title: string;
  emptyMessage?: string;
  showWaitlistPosition?: boolean;
  onPressParticipant?: (reg: Registration) => void;
}

export function ParticipantList({
  registrations,
  title,
  emptyMessage = 'Nenhum participante',
  showWaitlistPosition = false,
  onPressParticipant,
}: ParticipantListProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="label" weight="semibold">{title}</Text>
        <Text variant="caption" color="muted">{registrations.length}</Text>
      </View>

      {registrations.length === 0 ? (
        <Text variant="caption" color="muted" style={styles.empty}>
          {emptyMessage}
        </Text>
      ) : (
        registrations.map((reg) => (
          <TouchableOpacity
            key={reg.id}
            activeOpacity={onPressParticipant ? 0.7 : 1}
            onPress={() => onPressParticipant?.(reg)}
            style={[styles.row, { borderBottomColor: theme.background.border }]}
          >
            <Avatar
              name={reg.displayName}
              uri={reg.avatarUrl}
              size="sm"
              position={reg.playerPosition}
              showPositionBadge={!!reg.playerPosition}
            />
            <View style={styles.nameContainer}>
              <Text variant="body" weight="medium">{reg.displayName}</Text>
              {reg.playerPosition && (
                <Text variant="caption" color="muted">
                  {PLAYER_POSITION_LABELS[reg.playerPosition]}
                </Text>
              )}
            </View>
            {showWaitlistPosition && reg.waitlistPosition && (
              <Badge variant="warning" size="sm" label={`#${reg.waitlistPosition}`} />
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing[1],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing[3],
  },
  nameContainer: {
    flex: 1,
    gap: 2,
  },
  name: {
    flex: 1,
  },
});

import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useTeamStore } from '@/stores/teamStore';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Divider } from '@/components/ui/Divider';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { PLAYER_POSITION_LABELS } from '@/types/user.types';
import type { PrimeTeam, PrimeTeamMember } from '@/types/registration.types';
import type { Registration } from '@/types/registration.types';

interface PrimeTeamsViewProps {
  captains: Registration[];
}

const TEAM_COLORS = ['#8B5CF6', '#0A84FF', '#FF9F0A'] as const;

export function PrimeTeamsView({ captains }: PrimeTeamsViewProps) {
  const { theme } = useTheme();
  const { teams, isLoading } = useTeamStore();

  if (isLoading) return <LoadingSpinner />;

  if (captains.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="caption" color="muted">
          Nenhum capitão inscrito ainda. Os times aparecem aqui conforme as 3 vagas forem preenchidas.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {captains.map((captain, index) => {
        const team = teams.find((t) => t.captainId === captain.userId);
        const color = TEAM_COLORS[index % TEAM_COLORS.length];
        return (
          <TeamCard
            key={captain.userId}
            captain={captain}
            team={team}
            color={color}
            index={index + 1}
          />
        );
      })}
    </View>
  );
}

interface TeamCardProps {
  captain: Registration;
  team: PrimeTeam | undefined;
  color: string;
  index: number;
}

function TeamCard({ captain, team, color, index }: TeamCardProps) {
  const { theme } = useTheme();
  const members = team?.members ?? [];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.background.elevated, borderColor: theme.background.border },
      ]}
    >
      {/* Cabeçalho do time */}
      <View style={[styles.cardHeader, { borderLeftColor: color }]}>
        <View style={styles.captainRow}>
          <Avatar
            uri={captain.avatarUrl}
            name={captain.displayName}
            size="sm"
          />
          <View style={styles.captainInfo}>
            <View style={styles.captainNameRow}>
              <Text variant="body" weight="semibold">
                {captain.displayName}
              </Text>
              <Badge
                variant="accent"
                size="sm"
                label={`Time ${index}`}
              />
            </View>
            <Text variant="caption" color="muted">
              Capitão · {members.length} {members.length === 1 ? 'jogador' : 'jogadores'}
            </Text>
          </View>
        </View>
      </View>

      {/* Membros */}
      {members.length === 0 ? (
        <View style={styles.emptyMembers}>
          <Text variant="caption" color="muted">
            Aguardando o capitão montar o time...
          </Text>
        </View>
      ) : (
        <View style={styles.memberList}>
          {members.map((member) => (
            <MemberRow key={member.userId} member={member} />
          ))}
        </View>
      )}
    </View>
  );
}

function MemberRow({ member }: { member: PrimeTeamMember }) {
  const { theme } = useTheme();

  const statusConfig = {
    pending:  { label: 'Aguardando', variant: 'warning' as const },
    accepted: { label: 'Aceito',     variant: 'success' as const },
    declined: { label: 'Recusado',   variant: 'error'   as const },
  };
  const status = statusConfig[member.inviteStatus];

  return (
    <View style={[styles.memberRow, { borderColor: theme.background.border }]}>
      <Avatar uri={member.avatarUrl} name={member.displayName} size="xs" />
      <View style={styles.memberInfo}>
        <Text variant="caption" weight="medium">
          {member.displayName}
        </Text>
        {member.position && (
          <Text variant="caption" color="muted">
            {PLAYER_POSITION_LABELS[member.position]}
          </Text>
        )}
      </View>
      <Badge variant={status.variant} size="sm" label={status.label} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing[4],
  },
  empty: {
    paddingVertical: Spacing[4],
  },

  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    borderLeftWidth: 4,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  captainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  captainInfo: {
    flex: 1,
    gap: 2,
  },
  captainNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },

  emptyMembers: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },

  memberList: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[2],
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[2],
    borderTopWidth: 1,
    gap: Spacing[3],
  },
  memberInfo: {
    flex: 1,
    gap: 1,
  },
});

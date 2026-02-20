import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Modal, Pressable, Alert } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { ensureTeamExists, getAvailablePlayers, subscribeToEventTeams } from '@/services/teamService';
import { sendInvite, cancelInvite } from '@/services/inviteService';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Divider } from '@/components/ui/Divider';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { PLAYER_POSITION_LABELS } from '@/types/user.types';
import type { PrimeTeam, PrimeTeamMember } from '@/types/registration.types';
import type { User } from '@/types/user.types';
import type { Unsubscribe } from 'firebase/firestore';

interface PrimeCaptainPanelProps {
  eventId: string;
  eventTitle: string;
  captainId: string;
  captainDisplayName: string;
  captainAvatarUrl?: string;
}

type AvailablePlayer = Pick<User, 'uid' | 'displayName' | 'avatarUrl' | 'position'>;

const INVITE_STATUS_CONFIG = {
  pending:  { label: 'Aguardando', variant: 'warning' as const },
  accepted: { label: 'Aceito',     variant: 'success' as const },
  declined: { label: 'Recusado',   variant: 'error'   as const },
};

export function PrimeCaptainPanel({
  eventId,
  eventTitle,
  captainId,
  captainDisplayName,
  captainAvatarUrl,
}: PrimeCaptainPanelProps) {
  const { theme } = useTheme();
  const [team, setTeam] = useState<PrimeTeam | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<AvailablePlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null);

  // Garante que o doc do time existe e escuta mudanças em tempo real
  useEffect(() => {
    let unsub: Unsubscribe | null = null;

    const init = async () => {
      await ensureTeamExists(eventId, {
        userId: captainId,
        displayName: captainDisplayName,
        avatarUrl: captainAvatarUrl,
      });

      unsub = subscribeToEventTeams(eventId, (teams) => {
        const myTeam = teams.find((t) => t.captainId === captainId) ?? null;
        setTeam(myTeam);
        setInitializing(false);
      });
    };

    init().catch(() => setInitializing(false));
    return () => { unsub?.(); };
  }, [eventId, captainId]);

  const handleOpenInviteModal = useCallback(async () => {
    setInviteModalVisible(true);
    setLoadingPlayers(true);
    try {
      const players = await getAvailablePlayers(eventId);
      setAvailablePlayers(players);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar jogadores disponíveis');
    } finally {
      setLoadingPlayers(false);
    }
  }, [eventId]);

  const handleSendInvite = useCallback(async (player: AvailablePlayer) => {
    setInvitingUserId(player.uid);
    try {
      await sendInvite({
        eventId,
        eventTitle,
        captainId,
        captainName: captainDisplayName,
        captainAvatarUrl,
        toUserId: player.uid,
        toDisplayName: player.displayName,
        toAvatarUrl: player.avatarUrl,
        toPosition: player.position,
      });
      // Remove da lista de disponíveis após convite enviado
      setAvailablePlayers((prev) => prev.filter((p) => p.uid !== player.uid));
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao enviar convite');
    } finally {
      setInvitingUserId(null);
    }
  }, [eventId, eventTitle, captainId, captainDisplayName, captainAvatarUrl]);

  const handleCancelInvite = useCallback((member: PrimeTeamMember) => {
    const label = member.inviteStatus === 'pending' ? 'Cancelar convite' : 'Remover do time';
    const msg = member.inviteStatus === 'pending'
      ? `Cancelar o convite enviado para ${member.displayName}?`
      : `Deseja remover ${member.displayName} do time?`;

    Alert.alert(label, msg, [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim',
        style: 'destructive',
        onPress: async () => {
          setCancellingInviteId(member.inviteId);
          try {
            await cancelInvite(member.inviteId, captainId);
          } catch (err) {
            Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao cancelar convite');
          } finally {
            setCancellingInviteId(null);
          }
        },
      },
    ]);
  }, [captainId]);

  if (initializing) return <LoadingSpinner />;

  const members = team?.members ?? [];
  const acceptedCount = members.filter((m) => m.inviteStatus === 'accepted').length;
  const pendingCount  = members.filter((m) => m.inviteStatus === 'pending').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <View style={styles.headerTitleRow}>
            <Text variant="body" weight="bold">Meu Time</Text>
            <Badge variant="accent" size="sm" label="★ Prime" />
          </View>
          <Text variant="caption" color="muted" style={styles.subLabel}>
            {acceptedCount} {acceptedCount === 1 ? 'aceito' : 'aceitos'}
            {pendingCount > 0 ? ` · ${pendingCount} aguardando` : ''}
          </Text>
        </View>
        <Button
          label="+ Convidar"
          variant="primary"
          size="sm"
          onPress={handleOpenInviteModal}
        />
      </View>

      <Divider spacing={Spacing[2]} />

      {/* Capitão */}
      <View style={[styles.memberRow, { borderColor: theme.background.border }]}>
        <Avatar uri={captainAvatarUrl} name={captainDisplayName} size="sm" />
        <View style={styles.memberInfo}>
          <Text variant="body" weight="semibold">{captainDisplayName}</Text>
        </View>
        <Badge variant="accent" size="sm" label="Capitão" />
      </View>

      {/* Membros com status do convite */}
      {members.map((member) => {
        const statusCfg = INVITE_STATUS_CONFIG[member.inviteStatus] ?? INVITE_STATUS_CONFIG.pending;
        const isCancelling = cancellingInviteId === member.inviteId;
        return (
          <View key={member.userId} style={[styles.memberRow, { borderColor: theme.background.border }]}>
            <Avatar uri={member.avatarUrl} name={member.displayName} size="sm" />
            <View style={styles.memberInfo}>
              <Text variant="body" weight="medium">{member.displayName}</Text>
              {member.position && (
                <Text variant="caption" color="muted">
                  {PLAYER_POSITION_LABELS[member.position]}
                </Text>
              )}
            </View>
            <View style={styles.memberActions}>
              <Badge variant={statusCfg.variant} size="sm" label={statusCfg.label} />
              {isCancelling ? (
                <LoadingSpinner />
              ) : (
                <TouchableOpacity
                  onPress={() => handleCancelInvite(member)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text variant="caption" color="error">
                    {member.inviteStatus === 'pending' ? 'Cancelar' : 'Remover'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}

      {members.length === 0 && (
        <Text variant="caption" color="muted" style={styles.empty}>
          Convide jogadores para montar seu time tocando em "+ Convidar".
        </Text>
      )}

      {/* Modal: convidar jogador */}
      <Modal
        visible={inviteModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setInviteModalVisible(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.background.elevated }]}
            onPress={() => {}}
          >
            <View style={styles.modalHandle} />
            <Text variant="h4" weight="bold" style={styles.modalTitle}>
              Convidar para o time
            </Text>
            <Text variant="caption" color="muted" style={styles.modalSubtitle}>
              O jogador receberá um convite e poderá aceitar ou recusar.
            </Text>

            {loadingPlayers ? (
              <LoadingSpinner />
            ) : availablePlayers.length === 0 ? (
              <Text variant="body" color="muted" style={styles.empty}>
                Nenhum jogador disponível no momento.
              </Text>
            ) : (
              <FlatList
                data={availablePlayers}
                keyExtractor={(item) => item.uid}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.playerList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.playerRow, { borderColor: theme.background.border }]}
                    activeOpacity={0.7}
                    onPress={() => handleSendInvite(item)}
                    disabled={invitingUserId === item.uid}
                  >
                    <Avatar uri={item.avatarUrl} name={item.displayName} size="sm" />
                    <View style={styles.memberInfo}>
                      <Text variant="body" weight="medium">{item.displayName}</Text>
                      {item.position && (
                        <Text variant="caption" color="muted">
                          {PLAYER_POSITION_LABELS[item.position]}
                        </Text>
                      )}
                    </View>
                    {invitingUserId === item.uid ? (
                      <LoadingSpinner />
                    ) : (
                      <Badge variant="accent" size="sm" label="Convidar" />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}

            <Button
              label="Fechar"
              variant="ghost"
              size="md"
              fullWidth
              onPress={() => setInviteModalVisible(false)}
              style={styles.closeBtn}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
    marginBottom: Spacing[1],
  },
  subLabel: {
    marginTop: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: 2,
  },
  empty: {
    paddingVertical: Spacing[3],
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    gap: Spacing[3],
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberActions: {
    alignItems: 'flex-end',
    gap: Spacing[1],
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[8],
    maxHeight: '75%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    alignSelf: 'center',
    marginBottom: Spacing[4],
  },
  modalTitle: {
    marginBottom: Spacing[1],
  },
  modalSubtitle: {
    marginBottom: Spacing[4],
  },
  playerList: {
    gap: 0,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    gap: Spacing[3],
  },
  closeBtn: {
    marginTop: Spacing[4],
  },
});

import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { useInboxStore } from '@/stores/inboxStore';
import { acceptInvite, declineInvite } from '@/services/inviteService';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spacing, BorderRadius } from '@/constants/spacing';
import type { PrimeInvite } from '@/types/registration.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG = {
  pending:  { label: 'Pendente',  variant: 'warning' as const },
  accepted: { label: 'Aceito',    variant: 'success' as const },
  declined: { label: 'Recusado',  variant: 'error'   as const },
};

export default function InboxScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { invites, isLoading } = useInboxStore();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pending  = invites.filter((i) => i.status === 'pending');
  const resolved = invites.filter((i) => i.status !== 'pending');

  async function handleAccept(invite: PrimeInvite) {
    if (!user) return;
    setProcessingId(invite.id);
    try {
      await acceptInvite(invite.id, user.uid);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao aceitar convite');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDecline(invite: PrimeInvite) {
    if (!user) return;
    Alert.alert(
      'Recusar convite',
      `Deseja recusar o convite de ${invite.captainName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recusar',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(invite.id);
            try {
              await declineInvite(invite.id, user.uid);
            } catch (err) {
              Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao recusar convite');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.topBar}>
          <Button label="← Voltar" variant="ghost" size="sm" onPress={() => router.back()} />
        </View>

        <View style={styles.titleRow}>
          <Text variant="h3" weight="bold">Convites</Text>
          {pending.length > 0 && (
            <Badge variant="warning" size="sm" label={String(pending.length)} />
          )}
        </View>

        {isLoading ? (
          <LoadingSpinner />
        ) : invites.length === 0 ? (
          <EmptyState
            title="Nenhum convite"
            description="Quando uma capitã te convidar para o time, o convite aparece aqui."
          />
        ) : (
          <>
            {/* Pendentes primeiro */}
            {pending.length > 0 && (
              <>
                <Text variant="label" weight="semibold" color="muted" style={styles.sectionLabel}>
                  PENDENTES ({pending.length})
                </Text>
                {pending.map((invite) => (
                  <InviteCard
                    key={invite.id}
                    invite={invite}
                    onAccept={() => handleAccept(invite)}
                    onDecline={() => handleDecline(invite)}
                    processing={processingId === invite.id}
                  />
                ))}
              </>
            )}

            {/* Histórico */}
            {resolved.length > 0 && (
              <>
                <Text variant="label" weight="semibold" color="muted" style={[styles.sectionLabel, styles.sectionSpaced]}>
                  HISTÓRICO ({resolved.length})
                </Text>
                {resolved.map((invite) => (
                  <InviteCard
                    key={invite.id}
                    invite={invite}
                    processing={false}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface InviteCardProps {
  invite: PrimeInvite;
  onAccept?: () => void;
  onDecline?: () => void;
  processing: boolean;
}

function InviteCard({ invite, onAccept, onDecline, processing }: InviteCardProps) {
  const { theme } = useTheme();
  const statusConfig = STATUS_CONFIG[invite.status];
  const isPending = invite.status === 'pending';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.background.elevated, borderColor: theme.background.border },
        isPending && { borderLeftWidth: 4, borderLeftColor: theme.status.warning },
      ]}
    >
      {/* Info do evento */}
      <View style={styles.cardHeader}>
        <View style={styles.eventInfo}>
          <Text variant="body" weight="semibold" numberOfLines={1}>
            {invite.eventTitle}
          </Text>
          <Text variant="caption" color="muted">
            {format(invite.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </Text>
        </View>
        <Badge variant={statusConfig.variant} size="sm" label={statusConfig.label} />
      </View>

      {/* Capitã */}
      <View style={styles.captainRow}>
        <Avatar uri={invite.captainAvatarUrl} name={invite.captainName} size="sm" />
        <View style={styles.captainInfo}>
          <Text variant="caption" color="muted">Convite de</Text>
          <Text variant="body" weight="medium">{invite.captainName}</Text>
        </View>
      </View>

      {/* Ações para convites pendentes */}
      {isPending && (
        <View style={styles.actions}>
          {processing ? (
            <LoadingSpinner />
          ) : (
            <>
              <Button
                label="Aceitar"
                variant="primary"
                size="sm"
                style={styles.actionBtn}
                onPress={onAccept}
              />
              <Button
                label="Recusar"
                variant="danger"
                size="sm"
                style={styles.actionBtn}
                onPress={onDecline}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[10],
  },
  topBar: {
    marginTop: Spacing[2],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: Spacing[2],
    marginBottom: Spacing[5],
  },
  sectionLabel: {
    letterSpacing: 0.6,
    marginBottom: Spacing[3],
  },
  sectionSpaced: {
    marginTop: Spacing[6],
  },

  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    gap: Spacing[3],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  eventInfo: {
    flex: 1,
    gap: 2,
  },
  captainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  captainInfo: {
    flex: 1,
    gap: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginTop: Spacing[1],
  },
  actionBtn: {
    flex: 1,
  },
});

import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { Badge } from '@/components/ui/Badge';
import { Spacing } from '@/constants/spacing';
import { signOut } from '@/services/authService';
import { PLAYER_POSITION_LABELS } from '@/types/user.types';

export default function PerfilScreen() {
  const { theme } = useTheme();
  const { user, clearAuth } = useAuthStore();

  async function handleSignOut() {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          clearAuth();
          router.replace('/(auth)');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={styles.scroll}>
        <View style={styles.header}>
          <Text variant="h3" weight="bold">Perfil</Text>
        </View>

        {/* Card do usuário */}
        <Card variant="elevated" style={styles.profileCard}>
          <View style={styles.profileTop}>
            <Avatar
              name={user?.displayName ?? ''}
              uri={user?.avatarUrl}
              size="xl"
              position={user?.position}
              showPositionBadge={!!user?.position}
            />
            <View style={styles.profileInfo}>
              <Text variant="h4" weight="bold">{user?.displayName}</Text>
              <Text variant="label" color="muted">{user?.email}</Text>
              {user?.position && (
                <Badge
                  label={PLAYER_POSITION_LABELS[user.position]}
                  variant="accent"
                  size="sm"
                />
              )}
            </View>
          </View>

          {user?.role === 'admin' && (
            <>
              <Divider spacing={Spacing[3]} />
              <Badge label="Administrador" variant="accent" size="md" />
            </>
          )}
        </Card>

        {/* Disponibilidade */}
        <Card variant="outlined" style={styles.section}>
          <View style={styles.availabilityRow}>
            <View style={styles.availabilityInfo}>
              <Text variant="label" weight="semibold" color="secondary">
                Disponível para times
              </Text>
              <Text variant="caption" color="muted">
                {user?.availableForTeam
                  ? '✓ Você está disponível para seleção de times'
                  : 'Não está disponível para seleção de times'}
              </Text>
            </View>
            <View style={[
              styles.availabilityDot,
              { backgroundColor: user?.availableForTeam ? theme.status.success : theme.background.border },
            ]} />
          </View>
        </Card>

        {/* Ações */}
        <View style={styles.actions}>
          <Button
            label="Editar perfil"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => router.push('/(app)/editar-perfil')}
          />
          <Button
            label="Sair"
            variant="danger"
            size="lg"
            fullWidth
            onPress={handleSignOut}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flex: 1,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[8],
    gap: Spacing[4],
  },
  header: {
    paddingTop: Spacing[5],
  },
  profileCard: {
    gap: Spacing[3],
  },
  profileTop: {
    flexDirection: 'row',
    gap: Spacing[4],
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: Spacing[2],
  },
  section: {
    gap: Spacing[2],
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[3],
  },
  availabilityInfo: {
    flex: 1,
    gap: Spacing[1],
  },
  availabilityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actions: {
    gap: Spacing[3],
    marginTop: Spacing[2],
  },
});

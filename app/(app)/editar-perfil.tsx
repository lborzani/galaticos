import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { updateUserProfile, syncUserRegistrations } from '@/services/userService';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { PLAYER_POSITION_LABELS, type PlayerPosition } from '@/types/user.types';

const POSITIONS = Object.entries(PLAYER_POSITION_LABELS) as [PlayerPosition, string][];

export default function EditarPerfilScreen() {
  const { theme } = useTheme();
  const { user, setUser } = useAuthStore();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [position, setPosition] = useState<PlayerPosition | null>(user?.position ?? null);
  const [availableForTeam, setAvailableForTeam] = useState(user?.availableForTeam ?? false);
  // Preview local + base64 para salvar no Firestore
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos acessar sua galeria para trocar a foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,   // Comprime bem para caber no doc Firestore (< 1 MB)
      base64: true,   // Retorna base64 direto — sem Firebase Storage
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPreviewUri(asset.uri);
      if (asset.base64) {
        setAvatarBase64(`data:image/jpeg;base64,${asset.base64}`);
      }
    }
  }

  async function handleSave() {
    if (!user) return;
    if (!displayName.trim()) {
      Alert.alert('Erro', 'O nome não pode estar vazio.');
      return;
    }

    setSaving(true);
    try {
      // avatarUrl novo é o base64; se não trocou, mantém o anterior
      const newAvatarUrl = avatarBase64 ?? user.avatarUrl;

      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        position,
        availableForTeam,
        ...(newAvatarUrl !== user.avatarUrl && { avatarUrl: newAvatarUrl }),
      });

      // Atualiza inscrições ativas com novos dados (avatar, nome, posição)
      syncUserRegistrations(user.uid, {
        displayName: displayName.trim(),
        ...(newAvatarUrl !== user.avatarUrl && { avatarUrl: newAvatarUrl ?? undefined }),
        playerPosition: position,
      }).catch(() => {});

      setUser({
        ...user,
        displayName: displayName.trim(),
        position: position ?? undefined,
        availableForTeam,
        ...(newAvatarUrl ? { avatarUrl: newAvatarUrl } : {}),
      });

      Alert.alert('Salvo!', 'Perfil atualizado com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  }

  // Preview: mostra a imagem local se selecionou, senão a do perfil
  const avatarUri = previewUri ?? user?.avatarUrl;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Button
            label="← Voltar"
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            style={styles.back}
          />

          <Text variant="h3" weight="bold" style={styles.title}>Editar perfil</Text>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} disabled={saving}>
              <Avatar
                uri={avatarUri}
                name={displayName}
                size="xl"
                position={position ?? undefined}
                showPositionBadge={!!position}
              />
            </TouchableOpacity>
            <Text variant="caption" color="muted" style={styles.avatarHint}>
              Toque para alterar a foto
            </Text>
          </View>

          {/* Nome */}
          <Input
            label="Nome"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Seu nome"
            autoCapitalize="words"
          />

          {/* Posição */}
          <View style={styles.section}>
            <Text variant="label" weight="semibold" color="secondary" style={styles.sectionLabel}>
              Posição no vôlei
            </Text>
            <View style={styles.positionGrid}>
              {POSITIONS.map(([key, label]) => {
                const isSelected = position === key;
                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.75}
                    onPress={() => setPosition(isSelected ? null : key)}
                    style={[
                      styles.positionBtn,
                      {
                        backgroundColor: isSelected ? theme.accent.primary : theme.background.elevated,
                        borderColor: isSelected ? theme.accent.primary : theme.background.border,
                      },
                    ]}
                  >
                    <Text
                      variant="label"
                      weight={isSelected ? 'bold' : 'regular'}
                      style={{ color: isSelected ? '#FFFFFF' : theme.text.secondary }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Disponibilidade */}
          <View style={[styles.toggleRow, { backgroundColor: theme.background.elevated, borderColor: theme.background.border }]}>
            <View style={styles.toggleInfo}>
              <Text variant="body" weight="medium">Disponível para times</Text>
              <Text variant="caption" color="muted">
                {availableForTeam
                  ? 'Você aparecerá na lista para seleção de times'
                  : 'Você não será listado para seleção de times'}
              </Text>
            </View>
            <Switch
              value={availableForTeam}
              onValueChange={setAvailableForTeam}
              trackColor={{ false: theme.background.border, true: theme.accent.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Salvar */}
          <Button
            label="Salvar alterações"
            variant="primary"
            size="lg"
            fullWidth
            loading={saving}
            onPress={handleSave}
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[10],
  },
  back: {
    alignSelf: 'flex-start',
    marginTop: Spacing[2],
  },
  title: {
    marginTop: Spacing[3],
    marginBottom: Spacing[5],
  },

  avatarSection: {
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[5],
  },
  avatarHint: {
    marginTop: Spacing[1],
  },

  section: {
    marginTop: Spacing[4],
  },
  sectionLabel: {
    marginBottom: Spacing[3],
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  positionBtn: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing[4],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing[4],
    gap: Spacing[3],
  },
  toggleInfo: {
    flex: 1,
    gap: Spacing[1],
  },

  saveBtn: {
    marginTop: Spacing[6],
  },
});

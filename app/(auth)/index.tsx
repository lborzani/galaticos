import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing, BorderRadius } from '@/constants/spacing';

export default function WelcomeScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background.primary }]}
    >
      {/* Logo e identidade */}
      <View style={styles.hero}>
        <Image
          source={require('@/assets/logo.jpg')}
          style={[styles.logo, { shadowColor: theme.accent.primary }]}
          resizeMode="contain"
        />

        <View style={styles.textGroup}>
          <Text variant="h1" weight="black" style={styles.title}>
            Galáticos
          </Text>
          <Text variant="body" color="muted" style={styles.subtitle}>
            O sistema do time. Inscrições, listas e passaportes — tudo aqui.
          </Text>
        </View>
      </View>

      {/* Ações */}
      <View style={styles.actions}>
        <Button
          label="Entrar"
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.push('/(auth)/login')}
          style={styles.primaryButton}
        />
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            {
              borderColor: theme.accent.primary,
              backgroundColor: theme.accent.subtle,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text variant="body" weight="semibold" color="accent">
            Criar conta
          </Text>
        </TouchableOpacity>
        <Text variant="caption" color="muted" style={styles.disclaimer}>
          Apenas membros do time podem se cadastrar
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing[5],
    justifyContent: 'space-between',
    paddingBottom: Spacing[8],
    paddingTop: Spacing[10],
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[4],
    paddingBottom: Spacing[8],
  },
  logo: {
    width: 200,
    height: 200,
    borderRadius: 48,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },
  textGroup: {
    alignItems: 'center',
    gap: Spacing[3],
  },
  title: {
    textAlign: 'center',
    letterSpacing: -1,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 260,
  },
  actions: {
    gap: Spacing[3],
  },
  primaryButton: {
    paddingVertical: Spacing[5],
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: Spacing[4],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: {
    textAlign: 'center',
    marginTop: Spacing[1],
  },
});

import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { useTheme } from '@/providers/ThemeProvider';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spacing } from '@/constants/spacing';
import { signUp, signOut } from '@/services/authService';

const registerSchema = z
  .object({
    displayName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Mínimo de 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type FormErrors = Partial<Record<'displayName' | 'email' | 'password' | 'confirmPassword', string>>;

export default function RegisterScreen() {
  const { theme } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const result = registerSchema.safeParse({ displayName, email, password, confirmPassword });
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((e) => {
        const field = e.path[0] as keyof FormErrors;
        if (!fieldErrors[field]) fieldErrors[field] = e.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(email.trim(), password, displayName.trim());
      await signOut();
      Alert.alert(
        'Verifique seu e-mail',
        'Enviamos um link de verificação para o seu e-mail. Confirme antes de fazer login.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message.includes('email-already-in-use')
          ? 'Este e-mail já está em uso'
          : 'Erro ao criar conta. Tente novamente.';
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background.primary }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
      >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text variant="body" color="accent">← Voltar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text variant="h2" weight="bold" style={styles.title}>
            Criar conta
          </Text>
          <Text variant="body" color="muted" style={styles.subtitle}>
            Preencha seus dados para entrar no time
          </Text>

          <View style={styles.form}>
            <Input
              label="Nome completo"
              placeholder="Seu nome"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoComplete="name"
              error={errors.displayName}
            />

            <Input
              label="E-mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              error={errors.email}
            />

            <Input
              label="Senha"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              isPassword
              autoComplete="new-password"
              error={errors.password}
            />

            <Input
              label="Confirmar senha"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              autoComplete="new-password"
              error={errors.confirmPassword}
            />
          </View>

          <Button
            label="Criar conta"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleRegister}
          />

          <View style={styles.loginLink}>
            <Text variant="body" color="muted">Já tem conta? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text variant="body" color="accent" weight="semibold">
                Entrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[8],
  },
  header: {
    paddingTop: Spacing[4],
    paddingBottom: Spacing[2],
  },
  content: {
    flex: 1,
    paddingTop: Spacing[8],
    gap: Spacing[4],
  },
  title: {
    marginBottom: Spacing[1],
  },
  subtitle: {
    marginBottom: Spacing[4],
  },
  form: {
    gap: Spacing[4],
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing[2],
  },
});

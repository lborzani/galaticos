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
import { signIn, resetPassword, signOut, resendVerificationEmail } from '@/services/authService';
import { auth } from '@/services/firebase';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo de 6 caracteres'),
});

type FormErrors = Partial<Record<'email' | 'password', string>>;

export default function LoginScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((e) => {
        const field = e.path[0] as keyof FormErrors;
        fieldErrors[field] = e.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password);

      if (!auth.currentUser?.emailVerified) {
        await signOut();
        Alert.alert(
          'E-mail não verificado',
          'Verifique seu e-mail antes de fazer login. Deseja reenviar o link?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Reenviar',
              onPress: async () => {
                await signIn(email.trim(), password);
                await resendVerificationEmail();
                await signOut();
                Alert.alert('Pronto', 'Link de verificação reenviado.');
              },
            },
          ]
        );
        return;
      }

      router.replace('/(app)/(tabs)');
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message.includes('invalid-credential')
          ? 'E-mail ou senha incorretos'
          : 'Erro ao entrar. Tente novamente.';
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      Alert.alert('Informe seu e-mail', 'Digite seu e-mail para redefinir a senha.');
      return;
    }
    try {
      await resetPassword(email.trim());
      Alert.alert('E-mail enviado', 'Verifique sua caixa de entrada.');
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o e-mail. Verifique o endereço.');
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
            Bem-vindo de volta
          </Text>
          <Text variant="body" color="muted" style={styles.subtitle}>
            Entre com sua conta para acessar o time
          </Text>

          <View style={styles.form}>
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
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              isPassword
              autoComplete="password"
              error={errors.password}
            />

            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotPassword}
            >
              <Text variant="label" color="accent">
                Esqueci minha senha
              </Text>
            </TouchableOpacity>
          </View>

          <Button
            label="Entrar"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleLogin}
          />

          <View style={styles.registerLink}>
            <Text variant="body" color="muted">Não tem conta? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text variant="body" color="accent" weight="semibold">
                Criar conta
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -Spacing[2],
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing[2],
  },
});

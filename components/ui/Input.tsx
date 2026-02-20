import React, { useState } from 'react';
import {
  TextInput,
  View,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Text } from './Text';
import { FontFamily, FontSize } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  isPassword = false,
  style,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const borderColor = error
    ? theme.status.error
    : isFocused
    ? theme.accent.primary
    : theme.background.border;

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text variant="label" weight="medium" color="secondary" style={styles.label}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background.elevated,
            borderColor,
            borderWidth: isFocused || error ? 1.5 : 1,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            {
              color: theme.text.primary,
              fontFamily: FontFamily.regular,
              flex: 1,
            },
            style,
          ]}
          placeholderTextColor={theme.text.disabled}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.rightIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text variant="caption" color="muted">
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </Text>
          </TouchableOpacity>
        ) : (
          rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>
        )}
      </View>

      {error ? (
        <Text variant="caption" color="error" style={styles.helperText}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="muted" style={styles.helperText}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing[1],
  },
  label: {
    marginBottom: Spacing[1],
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[3],
    height: 52,
  },
  input: {
    fontSize: FontSize.base,
    paddingVertical: 0,
  },
  leftIcon: {
    marginRight: Spacing[2],
  },
  rightIcon: {
    marginLeft: Spacing[2],
  },
  helperText: {
    marginTop: Spacing[1],
  },
});

import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  type TouchableOpacityProps,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Text } from './Text';
import { BorderRadius, Spacing } from '@/constants/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  label: string;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  label,
  fullWidth = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();

  const isDisabled = disabled || loading;

  const sizeStyle = {
    sm: { paddingVertical: Spacing[2], paddingHorizontal: Spacing[3], borderRadius: BorderRadius.sm },
    md: { paddingVertical: Spacing[3], paddingHorizontal: Spacing[5], borderRadius: BorderRadius.md },
    lg: { paddingVertical: Spacing[4], paddingHorizontal: Spacing[6], borderRadius: BorderRadius.md },
  }[size];

  const variantStyle = {
    primary: {
      backgroundColor: isDisabled ? theme.accent.subtle : theme.accent.primary,
    },
    secondary: {
      backgroundColor: theme.background.elevated,
      borderWidth: 1,
      borderColor: theme.background.border,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    danger: {
      backgroundColor: isDisabled ? theme.status.errorSubtle : theme.status.error,
    },
    'danger-ghost': {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: isDisabled ? theme.status.errorSubtle : theme.status.error,
    },
  }[variant];

  const textColor = {
    primary: isDisabled ? 'muted' : 'inverse',
    secondary: 'primary',
    ghost: 'accent',
    danger: isDisabled ? 'muted' : 'inverse',
    'danger-ghost': isDisabled ? 'muted' : 'error',
  }[variant] as 'primary' | 'secondary' | 'muted' | 'accent' | 'inverse' | 'error';

  const textSize = { sm: 'label', md: 'label', lg: 'body' }[size] as 'label' | 'body';

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isDisabled}
      style={[
        styles.base,
        sizeStyle,
        variantStyle,
        fullWidth && styles.fullWidth,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'ghost' || variant === 'danger-ghost' ? theme.accent.primary : theme.text.inverse}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text variant={textSize} weight="semibold" color={textColor}>
            {label}
          </Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLeft: {
    marginRight: Spacing[2],
  },
  iconRight: {
    marginLeft: Spacing[2],
  },
});

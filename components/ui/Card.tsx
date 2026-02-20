import React from 'react';
import { View, type ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { BorderRadius, Spacing } from '@/constants/spacing';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'accent';

interface CardProps extends ViewProps {
  variant?: CardVariant;
  padding?: keyof typeof Spacing;
}

export function Card({
  variant = 'default',
  padding = 4,
  style,
  children,
  ...props
}: CardProps) {
  const { theme } = useTheme();

  const variantStyle = {
    default: {
      backgroundColor: theme.background.secondary,
    },
    elevated: {
      backgroundColor: theme.background.elevated,
    },
    outlined: {
      backgroundColor: theme.background.secondary,
      borderWidth: 1,
      borderColor: theme.background.border,
    },
    accent: {
      backgroundColor: theme.background.secondary,
      borderWidth: 1.5,
      borderColor: theme.accent.primary,
    },
  }[variant];

  return (
    <View
      style={[
        styles.base,
        { padding: Spacing[padding] },
        variantStyle,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
});

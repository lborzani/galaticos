import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Text } from './Text';
import { BorderRadius, Spacing } from '@/constants/spacing';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export function Badge({ label, variant = 'neutral', size = 'sm' }: BadgeProps) {
  const { theme } = useTheme();

  const variantStyle = {
    success: { bg: theme.status.successSubtle, text: theme.status.success },
    warning: { bg: theme.status.warningSubtle, text: theme.status.warning },
    error:   { bg: theme.status.errorSubtle,   text: theme.status.error },
    info:    { bg: theme.status.infoSubtle,     text: theme.status.info },
    accent:  { bg: theme.accent.subtle,         text: theme.accent.primary },
    neutral: { bg: theme.background.elevated,   text: theme.text.secondary },
  }[variant];

  const sizeStyle = {
    sm: { paddingVertical: Spacing[0] + 2, paddingHorizontal: Spacing[2] },
    md: { paddingVertical: Spacing[1],     paddingHorizontal: Spacing[3] },
  }[size];

  return (
    <View
      style={[
        styles.base,
        sizeStyle,
        { backgroundColor: variantStyle.bg },
      ]}
    >
      <Text
        variant="caption"
        weight="semibold"
        style={{ color: variantStyle.text }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
});

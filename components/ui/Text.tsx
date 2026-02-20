import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { FontFamily, FontSize } from '@/constants/typography';

type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodyLarge' | 'caption' | 'label';
type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'black';
type TextColor = 'primary' | 'secondary' | 'muted' | 'disabled' | 'accent' | 'success' | 'warning' | 'error' | 'inverse';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: TextWeight;
  color?: TextColor;
}

const variantStyles: Record<TextVariant, { fontSize: number; lineHeight: number }> = {
  h1:        { fontSize: FontSize['4xl'], lineHeight: FontSize['4xl'] * 1.2 },
  h2:        { fontSize: FontSize['3xl'], lineHeight: FontSize['3xl'] * 1.2 },
  h3:        { fontSize: FontSize['2xl'], lineHeight: FontSize['2xl'] * 1.25 },
  h4:        { fontSize: FontSize.xl,    lineHeight: FontSize.xl * 1.3 },
  bodyLarge: { fontSize: FontSize.lg,    lineHeight: FontSize.lg * 1.5 },
  body:      { fontSize: FontSize.base,  lineHeight: FontSize.base * 1.5 },
  label:     { fontSize: FontSize.sm,    lineHeight: FontSize.sm * 1.4 },
  caption:   { fontSize: FontSize.xs,    lineHeight: FontSize.xs * 1.4 },
};

const defaultWeightByVariant: Record<TextVariant, TextWeight> = {
  h1: 'black',
  h2: 'bold',
  h3: 'bold',
  h4: 'semibold',
  bodyLarge: 'regular',
  body: 'regular',
  label: 'medium',
  caption: 'regular',
};

export function Text({
  variant = 'body',
  weight,
  color = 'primary',
  style,
  ...props
}: TextProps) {
  const { theme } = useTheme();

  const resolvedWeight = weight ?? defaultWeightByVariant[variant];

  const colorMap: Record<TextColor, string> = {
    primary: theme.text.primary,
    secondary: theme.text.secondary,
    muted: theme.text.muted,
    disabled: theme.text.disabled,
    inverse: theme.text.inverse,
    accent: theme.accent.primary,
    success: theme.status.success,
    warning: theme.status.warning,
    error: theme.status.error,
  };

  return (
    <RNText
      style={[
        variantStyles[variant],
        { fontFamily: FontFamily[resolvedWeight], color: colorMap[color] },
        style,
      ]}
      {...props}
    />
  );
}

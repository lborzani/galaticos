import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: number;
}

export function Divider({ orientation = 'horizontal', spacing = 0 }: DividerProps) {
  const { theme } = useTheme();

  if (orientation === 'vertical') {
    return (
      <View
        style={[
          styles.vertical,
          { backgroundColor: theme.background.border, marginHorizontal: spacing },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.horizontal,
        { backgroundColor: theme.background.border, marginVertical: spacing },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    height: '100%',
  },
});

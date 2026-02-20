import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Text } from './Text';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  fullScreen?: boolean;
  label?: string;
}

export function LoadingSpinner({
  size = 'large',
  fullScreen = false,
  label,
}: LoadingSpinnerProps) {
  const { theme } = useTheme();

  const content = (
    <View style={styles.inner}>
      <ActivityIndicator size={size} color={theme.accent.primary} />
      {label && (
        <Text variant="caption" color="muted" style={styles.label}>
          {label}
        </Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View
        style={[styles.fullScreen, { backgroundColor: theme.background.primary }]}
      >
        {content}
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  inner: {
    alignItems: 'center',
    gap: 8,
  },
  label: {
    marginTop: 4,
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

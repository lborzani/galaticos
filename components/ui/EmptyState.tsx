import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { Spacing } from '@/constants/spacing';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text variant="h4" weight="semibold" style={styles.title}>
        {title}
      </Text>
      {description && (
        <Text variant="body" color="muted" style={styles.description}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="md"
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[8],
    gap: Spacing[3],
  },
  icon: {
    marginBottom: Spacing[2],
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
  },
  action: {
    marginTop: Spacing[2],
  },
});

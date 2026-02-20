import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Text } from '@/components/ui/Text';
import { Spacing, BorderRadius } from '@/constants/spacing';
import type { EventType } from '@/types/event.types';

interface TypeSelectorProps {
  value: EventType | null;
  onChange: (type: EventType) => void;
}

const TYPE_OPTIONS: { type: EventType; emoji: string; label: string }[] = [
  { type: 'prime', emoji: '★', label: 'Prime' },
  { type: 'sunday', emoji: '7', label: 'Domingo' },
  { type: 'custom', emoji: '+', label: 'Outro' },
];

export function TypeSelector({ value, onChange }: TypeSelectorProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {TYPE_OPTIONS.map(({ type, emoji, label }) => {
        const isSelected = value === type;
        return (
          <TouchableOpacity
            key={type}
            onPress={() => onChange(type)}
            style={[
              styles.option,
              {
                backgroundColor: isSelected ? theme.accent.primary : theme.background.elevated,
                borderColor: isSelected ? theme.accent.primary : theme.background.border,
              },
            ]}
          >
            <Text
              variant="h4"
              weight="bold"
              color={isSelected ? 'inverse' : 'accent'}
            >
              {emoji}
            </Text>
            <Text
              variant="caption"
              weight={isSelected ? 'semibold' : 'medium'}
              color={isSelected ? 'inverse' : 'secondary'}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  option: {
    flex: 1,
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing[1],
  },
});

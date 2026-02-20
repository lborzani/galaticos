import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Text } from './Text';
import { BorderRadius } from '@/constants/spacing';
import { Palette } from '@/constants/colors';
import { PLAYER_POSITION_LABELS, type PlayerPosition } from '@/types/user.types';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: AvatarSize;
  position?: PlayerPosition;
  showPositionBadge?: boolean;
}

const sizeConfig: Record<AvatarSize, { container: number; fontSize: number }> = {
  xs: { container: 28, fontSize: 10 },
  sm: { container: 36, fontSize: 13 },
  md: { container: 44, fontSize: 16 },
  lg: { container: 56, fontSize: 20 },
  xl: { container: 80, fontSize: 28 },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function Avatar({
  uri,
  name = '',
  size = 'md',
  position,
  showPositionBadge = false,
}: AvatarProps) {
  const { theme } = useTheme();
  const { container, fontSize } = sizeConfig[size];

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            width: container,
            height: container,
            borderRadius: container / 2,
            backgroundColor: theme.accent.subtle,
            borderWidth: 1.5,
            borderColor: theme.accent.primary,
          },
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={[
              styles.image,
              { borderRadius: container / 2 },
            ]}
          />
        ) : (
          <Text
            variant="body"
            weight="semibold"
            style={{ fontSize, color: theme.accent.primary }}
          >
            {getInitials(name)}
          </Text>
        )}
      </View>

      {showPositionBadge && position && (
        <View
          style={[
            styles.positionBadge,
            { backgroundColor: theme.accent.primary },
          ]}
        >
          <Text variant="caption" style={{ fontSize: 8, color: Palette.white }}>
            {PLAYER_POSITION_LABELS[position].slice(0, 3).toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  positionBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
});

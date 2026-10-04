import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

type NavigationHeaderProps = {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  transparent?: boolean;
};

export function NavigationHeader({ title, onBack, right, transparent = false }: NavigationHeaderProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.xs,
          paddingHorizontal: spacing.lg,
          backgroundColor: transparent ? 'transparent' : colors.background,
        },
      ]}
    >
      <View style={styles.side}>
        {onBack ? <IconButton name="chevron-back" accessibilityLabel="Go back" onPress={onBack} /> : null}
      </View>
      <View style={styles.center}>
        {title ? (
          <Text variant="h3" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.rightSide]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
  },
  side: {
    width: 44,
  },
  rightSide: {
    width: undefined,
    minWidth: 44,
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

type NavigationHeaderProps = {
  title?: string;
  onBack?: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
  transparent?: boolean;
};

/**
 * Sits inside `Screen`, which already insets the top safe area. Adding
 * `insets.top` here again drops the bar by a full status-bar height on
 * notched iPhones and by the window inset inside sheets, where that
 * overlap is already zero.
 */
export function NavigationHeader({ title, onBack, left, right, transparent = false }: NavigationHeaderProps) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: spacing.xs,
          paddingHorizontal: spacing.lg,
          backgroundColor: transparent ? 'transparent' : colors.background,
        },
      ]}
    >
      <View style={styles.side}>
        {left ?? (onBack ? <IconButton name="chevron-back" accessibilityLabel={t('common.goBack')} onPress={onBack} /> : null)}
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
    zIndex: 2,
  },
  side: {
    flex: 1,
    minWidth: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 3,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
});

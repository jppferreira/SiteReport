import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'destructive' | 'accent';

type StatusBadgeProps = {
  label: string;
  tone?: BadgeTone;
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const { colors, radius } = useTheme();
  const palette = getPalette(tone, colors);

  return (
    <View style={[styles.base, { backgroundColor: palette.bg, borderRadius: radius.pill }]}>
      <Text variant="caption" color={palette.fg}>
        {label}
      </Text>
    </View>
  );
}

function getPalette(tone: BadgeTone, colors: ReturnType<typeof useTheme>['colors']) {
  switch (tone) {
    case 'success':
      return { bg: colors.successSoft, fg: colors.success };
    case 'warning':
      return { bg: colors.warningSoft, fg: colors.warning };
    case 'destructive':
      return { bg: colors.destructiveSoft, fg: colors.destructive };
    case 'accent':
      return { bg: colors.accentSoft, fg: colors.accentPressed };
    default:
      return { bg: colors.surfaceSunken, fg: colors.textSecondary };
  }
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
});

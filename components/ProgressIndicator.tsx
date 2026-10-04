import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { motionTiming, useTheme } from '@/theme';

import { Text } from './Text';

type ProgressIndicatorProps = {
  completed: number;
  total: number;
  label?: string;
};

export function ProgressIndicator({ completed, total, label }: ProgressIndicatorProps) {
  const { colors, radius, spacing } = useTheme();
  const progress = useSharedValue(0);
  const ratio = total > 0 ? completed / total : 0;

  useEffect(() => {
    progress.value = motionTiming(ratio, { duration: 300 });
  }, [ratio, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progress.value * 100)}%`,
  }));

  return (
    <View>
      <View style={[styles.row, { marginBottom: spacing.xs }]}>
        <Text variant="caption" color={colors.textSecondary}>
          {label ?? 'REPORT PROGRESS'}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {completed} of {total} sections complete
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceSunken, borderRadius: radius.pill }]}>
        <Animated.View
          style={[styles.fill, { backgroundColor: colors.accent, borderRadius: radius.pill }, animatedStyle]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});

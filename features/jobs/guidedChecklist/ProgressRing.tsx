import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components';
import { useTheme } from '@/theme';

type ProgressRingProps = {
  completed: number;
  total: number;
  size?: number;
};

/** Circular step progress for the guided job checklist header. */
export function ProgressRing({ completed, total, size = 58 }: ProgressRingProps) {
  const { colors } = useTheme();
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(1, Math.max(0, completed / total)) : 0;
  const offset = circumference * (1 - progress);
  const label = `${completed}/${total}`;

  return (
    <View style={[styles.wrap, { width: size, height: size }]} accessibilityRole="progressbar">
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        {progress > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.accent}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        ) : null}
      </Svg>
      <Text variant="bodyMedium" style={{ fontSize: 15, fontWeight: '700', letterSpacing: -0.2 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

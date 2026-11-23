import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

const BAR_COUNT = 24;

type LevelMeterProps = {
  level: number;
  active: boolean;
};

/** Audio-level bars — not a live transcript. */
export function LevelMeter({ level, active }: LevelMeterProps) {
  const { colors, radius } = useTheme();
  const bars = useMemo(() => Array.from({ length: BAR_COUNT }, (_, i) => i), []);
  const clamped = Math.max(0, Math.min(1, level));

  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      {bars.map((index) => {
        const threshold = (index + 1) / BAR_COUNT;
        const lit = active && clamped >= threshold * 0.55;
        const height = 10 + ((index % 5) + 1) * 6;
        return (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height,
                borderRadius: radius.sm,
                backgroundColor: lit ? colors.accent : colors.border,
                opacity: lit ? 1 : 0.55,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 3,
  },
  bar: {
    flex: 1,
    minWidth: 3,
  },
});

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

type Segment = { key: string; label: string };

type SegmentedControlProps = {
  segments: Segment[];
  value: string;
  onChange: (key: string) => void;
};

export function SegmentedControl({ segments, value, onChange }: SegmentedControlProps) {
  const { colors, radius } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSunken, borderRadius: radius.pill }]}>
      {segments.map((segment) => {
        const active = segment.key === value;
        return (
          <Pressable
            key={segment.key}
            onPress={() => onChange(segment.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              styles.segment,
              { borderRadius: radius.pill, backgroundColor: active ? colors.accent : 'transparent' },
            ]}
          >
            <Text variant="bodyMedium" color={active ? colors.accentOnAccent : colors.textSecondary}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    height: 44,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

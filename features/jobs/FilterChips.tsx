import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { useTheme } from '@/theme';

import { JobsFilter } from '@/hooks/useJobs';

const OPTIONS: { key: JobsFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'complete', label: 'Complete' },
];

type FilterChipsProps = {
  value: JobsFilter;
  onChange: (value: JobsFilter) => void;
};

export function FilterChips({ value, onChange }: FilterChipsProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={[styles.row, { gap: spacing.xs }]}>
      {OPTIONS.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Filter: ${option.label}`}
            style={[
              styles.chip,
              {
                borderRadius: radius.pill,
                backgroundColor: active ? colors.ctaDark : colors.surface,
                borderColor: active ? colors.ctaDark : colors.border,
              },
            ]}
          >
            <Text variant="bodySmall" color={active ? colors.textInverse : colors.textPrimary}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

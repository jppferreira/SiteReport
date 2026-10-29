import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { JobsFilter } from '@/hooks/useJobs';

const OPTIONS: { key: JobsFilter; labelKey: 'jobs.filterAll' | 'jobs.filterDraft' | 'jobs.filterComplete' }[] = [
  { key: 'all', labelKey: 'jobs.filterAll' },
  { key: 'draft', labelKey: 'jobs.filterDraft' },
  { key: 'complete', labelKey: 'jobs.filterComplete' },
];

type FilterChipsProps = {
  value: JobsFilter;
  onChange: (value: JobsFilter) => void;
};

export function FilterChips({ value, onChange }: FilterChipsProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();

  return (
    <View style={[styles.row, { gap: spacing.xs }]}>
      {OPTIONS.map((option) => {
        const active = option.key === value;
        const label = t(option.labelKey);
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t('jobs.filterA11y', { label })}
            style={[
              styles.chip,
              {
                borderRadius: radius.pill,
                backgroundColor: active ? colors.accent : colors.surface,
                borderColor: active ? colors.accent : colors.border,
              },
            ]}
          >
            <Text variant="bodySmall" color={active ? colors.accentOnAccent : colors.textPrimary}>
              {label}
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

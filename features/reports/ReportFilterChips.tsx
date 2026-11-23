import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components';
import { ReportsFilter } from '@/features/reports/filterReports';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

const OPTIONS: {
  key: ReportsFilter;
  labelKey: 'reports.filterAll' | 'reports.filterActive' | 'reports.filterDraft' | 'reports.filterArchived';
}[] = [
  { key: 'all', labelKey: 'reports.filterAll' },
  { key: 'active', labelKey: 'reports.filterActive' },
  { key: 'draft', labelKey: 'reports.filterDraft' },
  { key: 'archived', labelKey: 'reports.filterArchived' },
];

type ReportFilterChipsProps = {
  value: ReportsFilter;
  onChange: (value: ReportsFilter) => void;
};

export function ReportFilterChips({ value, onChange }: ReportFilterChipsProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.row, { gap: spacing.xs }]}
    >
      {OPTIONS.map((option) => {
        const active = option.key === value;
        const label = t(option.labelKey);
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t('reports.filterA11y', { label })}
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
    </ScrollView>
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

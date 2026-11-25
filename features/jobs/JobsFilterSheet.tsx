import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet, Button, Text, TextButton } from '@/components';
import {
  EMPTY_SHEET_FILTERS,
  type JobsDatePreset,
  type JobsSheetFilters,
  type JobsSheetStatusFilter,
} from '@/hooks/useJobs';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { DateField } from './DateField';

const STATUS_OPTIONS = ['draft', 'sent', 'unpaid', 'paid'] as const satisfies readonly NonNullable<JobsSheetStatusFilter>[];
const DATE_OPTIONS = ['this_month', 'last_30', 'custom'] as const satisfies readonly Exclude<JobsDatePreset, null>[];

type JobsFilterSheetProps = {
  visible: boolean;
  value: JobsSheetFilters;
  onClose: () => void;
  onApply: (next: JobsSheetFilters) => void;
};

export function JobsFilterSheet({ visible, value, onClose, onApply }: JobsFilterSheetProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const [draft, setDraft] = useState<JobsSheetFilters>(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const statusLabel = (key: NonNullable<JobsSheetStatusFilter>) => {
    switch (key) {
      case 'draft':
        return t('jobs.filterStatusDraft');
      case 'sent':
        return t('jobs.filterStatusSent');
      case 'unpaid':
        return t('jobs.filterStatusUnpaid');
      case 'paid':
        return t('jobs.filterStatusPaid');
    }
  };

  const dateLabel = (key: Exclude<JobsDatePreset, null>) => {
    switch (key) {
      case 'this_month':
        return t('jobs.filterDateThisMonth');
      case 'last_30':
        return t('jobs.filterDateLast30');
      case 'custom':
        return t('jobs.filterDateCustom');
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dragHandleOnly maxHeight={520}>
      <Text variant="h3" style={styles.title}>
        {t('jobs.filtersTitle')}
      </Text>

      <Text variant="caption" color={colors.textTertiary} style={styles.sectionLabel}>
        {t('jobs.filtersStatusSection')}
      </Text>
      <View style={[styles.chipRow, { gap: spacing.xs }]}>
        {STATUS_OPTIONS.map((key) => {
          const selected = draft.status === key;
          return (
            <Pressable
              key={key}
              onPress={() =>
                setDraft((prev) => ({ ...prev, status: prev.status === key ? null : key }))
              }
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                {
                  borderRadius: radius.pill,
                  backgroundColor: selected ? colors.accent : colors.surface,
                  borderColor: selected ? colors.accent : colors.border,
                },
              ]}
            >
              <Text variant="bodySmall" color={selected ? colors.accentOnAccent : colors.textPrimary}>
                {statusLabel(key)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text variant="caption" color={colors.textTertiary} style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
        {t('jobs.filtersDateSection')}
      </Text>
      <View style={[styles.chipRow, { gap: spacing.xs }]}>
        {DATE_OPTIONS.map((key) => {
          const selected = draft.datePreset === key;
          return (
            <Pressable
              key={key}
              onPress={() =>
                setDraft((prev) => {
                  if (prev.datePreset === key) {
                    return { ...prev, datePreset: null };
                  }
                  const today = new Date().toISOString().slice(0, 10);
                  return {
                    ...prev,
                    datePreset: key,
                    dateFrom: prev.dateFrom ?? today,
                    dateTo: prev.dateTo ?? today,
                  };
                })
              }
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                {
                  borderRadius: radius.pill,
                  backgroundColor: selected ? colors.accent : colors.surface,
                  borderColor: selected ? colors.accent : colors.border,
                },
              ]}
            >
              <Text variant="bodySmall" color={selected ? colors.accentOnAccent : colors.textPrimary}>
                {dateLabel(key)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {draft.datePreset === 'custom' ? (
        <View style={[styles.dateFields, { gap: spacing.sm, marginTop: spacing.md }]}>
          <View style={styles.dateField}>
            <DateField
              label={t('jobs.filtersDateFrom')}
              value={draft.dateFrom ?? new Date().toISOString().slice(0, 10)}
              onChange={(dateFrom) => setDraft((prev) => ({ ...prev, dateFrom }))}
            />
          </View>
          <View style={styles.dateField}>
            <DateField
              label={t('jobs.filtersDateTo')}
              value={draft.dateTo ?? new Date().toISOString().slice(0, 10)}
              onChange={(dateTo) => setDraft((prev) => ({ ...prev, dateTo }))}
            />
          </View>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <Button
          label={t('jobs.filtersApply')}
          onPress={() => {
            onApply(draft);
            onClose();
          }}
        />
        <TextButton
          label={t('jobs.filtersReset')}
          onPress={() => {
            setDraft(EMPTY_SHEET_FILTERS);
            onApply(EMPTY_SHEET_FILTERS);
            onClose();
          }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: 'Lexend_600SemiBold',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dateFields: {
    flexDirection: 'row',
  },
  dateField: {
    flex: 1,
  },
});

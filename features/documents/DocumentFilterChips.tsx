import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { DocumentSegment, DocumentStatusFilter } from './filterDocuments';

type ChipDef = {
  key: DocumentStatusFilter;
  labelKey: string;
};

const CHIPS_BY_SEGMENT: Record<DocumentSegment, ChipDef[]> = {
  quote: [
    { key: 'all', labelKey: 'documents.filterAll' },
    { key: 'draft', labelKey: 'documents.statusDraft' },
    { key: 'sent', labelKey: 'documents.statusSent' },
    { key: 'accepted', labelKey: 'documents.statusAccepted' },
    { key: 'declined', labelKey: 'documents.statusDeclined' },
  ],
  report: [
    { key: 'all', labelKey: 'documents.filterAll' },
    { key: 'draft', labelKey: 'documents.statusDraft' },
    { key: 'sent', labelKey: 'documents.statusSent' },
  ],
  invoice: [
    { key: 'all', labelKey: 'documents.filterAll' },
    { key: 'unpaid', labelKey: 'documents.statusUnpaid' },
    { key: 'overdue', labelKey: 'documents.statusOverdue' },
    { key: 'paid', labelKey: 'documents.statusPaid' },
    { key: 'draft', labelKey: 'documents.statusDraft' },
  ],
};

type DocumentFilterChipsProps = {
  segment: DocumentSegment;
  value: DocumentStatusFilter;
  onChange: (value: DocumentStatusFilter) => void;
  counts?: Record<string, number>;
};

export function DocumentFilterChips({ segment, value, onChange, counts }: DocumentFilterChipsProps) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const options = useMemo(() => CHIPS_BY_SEGMENT[segment], [segment]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.row, { gap: spacing.xs }]}
    >
      {options.map((option) => {
        const active = option.key === value;
        const count = counts?.[option.key];
        const label = t(option.labelKey);
        const display = count != null ? `${label} (${count})` : label;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.ctaDark : colors.surface,
                borderColor: active ? colors.ctaDark : colors.border,
              },
            ]}
          >
            <Text
              variant="bodySmall"
              color={active ? colors.textInverse : colors.textPrimary}
              style={styles.chipLabel}
            >
              {display}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 18,
  },
  chipLabel: {
    fontFamily: 'Lexend_600SemiBold',
    fontSize: 13,
  },
});

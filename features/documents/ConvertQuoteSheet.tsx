import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet, Button, Input, Text, ToggleRow } from '@/components';
import { formatPence } from '@/models';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { DOC_KIND_TILE_BG } from './documentTokens';
import { DocTypeTile } from './DocTypeTile';

type ConvertQuoteSheetProps = {
  visible: boolean;
  quoteNumber: string | null;
  quoteTotalPence: number | null;
  invoicePreviewNumber: string;
  invoiceTotalPence: number | null;
  lineCount: number;
  defaultDueDays: number;
  hasReport: boolean;
  showVatNote?: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (opts: { copyPricing: boolean; attachReport: boolean; dueDays: number }) => void;
};

export function ConvertQuoteSheet({
  visible,
  quoteNumber,
  quoteTotalPence,
  invoicePreviewNumber,
  invoiceTotalPence,
  lineCount,
  defaultDueDays,
  hasReport,
  showVatNote = false,
  loading,
  onClose,
  onSubmit,
}: ConvertQuoteSheetProps) {
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();
  const [copyPricing, setCopyPricing] = useState(true);
  const [attachReport, setAttachReport] = useState(hasReport);
  const [dueDays, setDueDays] = useState(String(defaultDueDays));
  const [dueEditing, setDueEditing] = useState(false);

  useEffect(() => {
    if (visible) {
      setCopyPricing(true);
      setAttachReport(hasReport);
      setDueDays(String(defaultDueDays));
      setDueEditing(false);
    }
  }, [visible, defaultDueDays, hasReport]);

  const handleSubmit = () => {
    const days = Math.max(1, Math.min(365, Number.parseInt(dueDays, 10) || defaultDueDays));
    onSubmit({ copyPricing, attachReport: hasReport && attachReport, dueDays: days });
  };

  const quoteAmountLabel = quoteTotalPence != null ? formatPence(quoteTotalPence) : '—';
  const invoiceAmountLabel =
    invoiceTotalPence != null
      ? showVatNote
        ? t('documents.convertAmountIncVat', { amount: formatPence(invoiceTotalPence) })
        : formatPence(invoiceTotalPence)
      : '—';

  return (
    <BottomSheet visible={visible} onClose={onClose} dragHandleOnly>
      <Text variant="h3">{t('documents.convertTitle')}</Text>
      <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 6, marginBottom: spacing.md }}>
        {t('documents.convertSubtitlePreview', {
          quote: quoteNumber ?? '—',
          invoice: invoicePreviewNumber,
        })}
      </Text>

      <View style={styles.previewRow}>
        <ConvertKindCard
          kind="quote"
          number={quoteNumber ?? '—'}
          amount={quoteAmountLabel}
        />
        <Ionicons name="arrow-forward" size={18} color={colors.textTertiary} style={{ marginTop: 28 }} />
        <ConvertKindCard
          kind="invoice"
          number={invoicePreviewNumber}
          amount={invoiceAmountLabel}
        />
      </View>

      <View style={[styles.optionList, { borderColor: colors.border, borderRadius: radius.lg, marginTop: spacing.md }]}>
        <OptionToggleRow
          label={
            lineCount > 0
              ? t('documents.convertCopyLinesCount', { count: lineCount })
              : t('documents.convertCopyLines')
          }
          checked={copyPricing}
          onPress={() => setCopyPricing((v) => !v)}
        />
        {hasReport ? (
          <View style={[styles.optionDivider, { backgroundColor: colors.border }]} />
        ) : null}
        {hasReport ? (
          <View style={{ paddingHorizontal: spacing.md }}>
            <ToggleRow
              label={t('documents.convertAttachReport')}
              value={attachReport}
              onValueChange={setAttachReport}
            />
          </View>
        ) : null}
        <View style={[styles.optionDivider, { backgroundColor: colors.border }]} />
        <Pressable
          onPress={() => setDueEditing((v) => !v)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.dueRow,
            { paddingHorizontal: spacing.md, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text variant="body">{t('documents.convertDueInDays', { days: dueDays })}</Text>
          <Ionicons name={dueEditing ? 'chevron-up' : 'chevron-forward'} size={18} color={colors.textTertiary} />
        </Pressable>
        {dueEditing ? (
          <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
            <Input
              label={t('documents.convertDueDays')}
              value={dueDays}
              onChangeText={setDueDays}
              keyboardType="number-pad"
            />
          </View>
        ) : null}
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <Button
          label={t('documents.convertCreateWithNumber', { number: invoicePreviewNumber })}
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          variant="accent"
          icon={<Ionicons name="checkmark" size={18} color={colors.accentOnAccent} />}
        />
      </View>
    </BottomSheet>
  );
}

function ConvertKindCard({
  kind,
  number,
  amount,
}: {
  kind: 'quote' | 'invoice';
  number: string;
  amount: string;
}) {
  const { spacing, radius } = useTheme();

  return (
    <View
      style={[
        styles.kindCard,
        {
          backgroundColor: DOC_KIND_TILE_BG[kind],
          borderRadius: radius.lg,
          padding: spacing.md,
        },
      ]}
    >
      <DocTypeTile kind={kind} size={44} />
      <Text variant="bodyMedium" numberOfLines={1} style={{ marginTop: spacing.sm, fontFamily: 'Lexend_600SemiBold' }}>
        {number}
      </Text>
      <Text variant="bodySmall" color="rgba(16,19,16,0.65)" numberOfLines={2} style={{ marginTop: 2, textAlign: 'center' }}>
        {amount}
      </Text>
    </View>
  );
}

function OptionToggleRow({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  const { colors, spacing } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      style={({ pressed }) => [
        styles.optionRow,
        { paddingHorizontal: spacing.md, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      {checked ? (
        <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
      ) : (
        <View style={[styles.emptyCheck, { borderColor: colors.borderStrong }]} />
      )}
      <Text variant="body" style={styles.flex}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 10,
  },
  kindCard: {
    flex: 1,
    alignItems: 'center',
    minHeight: 120,
  },
  optionList: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    gap: 12,
  },
  optionDivider: {
    height: StyleSheet.hairlineWidth,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  flex: { flex: 1 },
  emptyCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
});
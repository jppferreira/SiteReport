import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet, Text, TextButton } from '@/components';
import { PricingReference, type PricingReferenceHandle } from '@/features/jobs/PricingReference';
import { useI18n } from '@/i18n/useI18n';
import {
  blankPricingLine,
  formatPence,
  linesForReport,
  parseAmountToPence,
  pricingVatBreakdown,
  type PricingCategory,
  type ReportPricing,
  VAT_RATE_PERCENT,
} from '@/models';
import { useTheme } from '@/theme';
import { generateId } from '@/utils/id';

type DocumentPriceEditorProps = {
  pricing: ReportPricing;
  hasVat: boolean;
  pricingRef: React.RefObject<PricingReferenceHandle | null>;
  onSavePricing: (pricing: ReportPricing) => Promise<ReportPricing>;
};

/**
 * Figma S3 price block: lines, + Add line / Labour / Materials chips, live VAT totals.
 */
export function DocumentPriceEditor({
  pricing,
  hasVat,
  pricingRef,
  onSavePricing,
}: DocumentPriceEditorProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);

  const lines = useMemo(() => linesForReport(pricing), [pricing]);
  const breakdown = useMemo(
    () => pricingVatBreakdown(lines, hasVat ? VAT_RATE_PERCENT : 0),
    [lines, hasVat]
  );

  const addLine = async (category: PricingCategory, presetDescription?: string) => {
    const next: ReportPricing = {
      enabled: true,
      lines: [
        ...(pricing.enabled ? pricing.lines : []),
        {
          ...blankPricingLine(generateId(), category),
          ...(presetDescription ? { description: presetDescription } : {}),
        },
      ],
    };
    await onSavePricing(next);
    setEditing(true);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: spacing.md,
          gap: spacing.sm,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text variant="bodyMedium">{t('costs.priceLines')}</Text>
        <TextButton label={t('documents.editor.reorder')} tone="accent" onPress={() => setEditing(true)} />
      </View>

      {lines.length === 0 ? (
        <Text variant="caption" color={colors.textSecondary}>
          {t('pricing.emptyHintDocument')}
        </Text>
      ) : (
        <View style={{ gap: 2 }}>
          {lines.map((line) => {
            const value = parseAmountToPence(line.amount);
            const amountLabel = value === null ? '—' : formatPence(value);
            return (
              <Pressable
                key={line.id}
                onPress={() => setEditing(true)}
                style={[styles.lineRow, { borderBottomColor: colors.border }]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyMedium" numberOfLines={1}>
                    {line.description.trim() || '—'}
                  </Text>
                  <Text variant="caption" color={colors.textSecondary}>
                    {categoryHint(t, line.category)}
                  </Text>
                </View>
                <Text variant="bodyMedium">{amountLabel}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.chipRow}>
        <QuickChip
          icon="add"
          label={t('documents.editor.addLine')}
          onPress={() => void addLine('other')}
        />
        <QuickChip
          icon="add"
          label={t('pricing.categoryLabour')}
          onPress={() => void addLine('labour', t('pricing.categoryLabour'))}
        />
        <QuickChip
          icon="add"
          label={t('pricing.categoryMaterials')}
          onPress={() => void addLine('materials', t('pricing.categoryMaterials'))}
        />
      </View>

      {breakdown ? (
        <View style={{ gap: 6, marginTop: spacing.xs }}>
          {hasVat ? (
            <>
              <TotalRow label={t('costs.subtotal')} value={formatPence(breakdown.subtotalPence)} muted />
              <TotalRow
                label={t('costs.vat', { rate: String(VAT_RATE_PERCENT) })}
                value={formatPence(breakdown.vatPence)}
                muted
              />
            </>
          ) : null}
          <TotalRow label={t('costs.total')} value={formatPence(breakdown.totalPence)} strong />
        </View>
      ) : null}

      <BottomSheet visible={editing} onClose={() => setEditing(false)}>
        <Text variant="h3" style={{ marginBottom: spacing.md }}>
          {t('costs.editPrices')}
        </Text>
        <PricingReference
          ref={pricingRef}
          pricing={pricing.enabled ? pricing : { enabled: true, lines: pricing.lines }}
          onSave={onSavePricing}
          copyTone="document"
        />
        <View style={{ marginTop: spacing.md }}>
          <Pressable onPress={() => setEditing(false)}>
            <Text variant="bodyMedium" color={colors.accent} style={{ textAlign: 'center' }}>
              {t('common.done')}
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

function QuickChip({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.chip,
        {
          backgroundColor: colors.surfaceSunken,
          paddingHorizontal: spacing.sm,
          gap: 4,
        },
      ]}
    >
      <Ionicons name={icon} size={14} color={colors.textPrimary} />
      <Text variant="caption" style={{ fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function TotalRow({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.headerRow}>
      <Text variant={strong ? 'bodyMedium' : 'body'} color={muted ? colors.textSecondary : colors.textPrimary}>
        {label}
      </Text>
      <Text variant={strong ? 'bodyMedium' : 'bodyMedium'} color={colors.textPrimary}>
        {value}
      </Text>
    </View>
  );
}

function categoryHint(t: (key: string) => string, category: PricingCategory): string {
  if (category === 'labour') return t('pricing.categoryLabour');
  if (category === 'materials') return t('pricing.categoryMaterials');
  return t('pricing.categoryOther');
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderRadius: 16,
    paddingRight: 12,
  },
});

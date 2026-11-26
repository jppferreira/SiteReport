import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import {
  VAT_RATE_PERCENT,
  documentStatusLabel,
  effectiveStatus,
  formatPence,
  linesForReport,
  parseAmountToPence,
  pricingVatBreakdown,
  type DocumentKind,
  type PricingCategory,
  type ReportPricing,
  type TradeDocument,
} from '@/models';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

export type CommercialPreviewCardProps = {
  kind: Extract<DocumentKind, 'quote' | 'invoice'>;
  number: string | null;
  status: TradeDocument['status'];
  dueDate?: string | null;
  title: string;
  customerName: string | null;
  customerAddress: string | null;
  pricing: ReportPricing;
  hasVat: boolean;
};

/**
 * Figma S3a document card — shared by quote and invoice preview.
 * Native summary of number, customer, lines and totals (not the PDF WebView).
 */
export function CommercialPreviewCard({
  kind,
  number,
  status,
  dueDate = null,
  title,
  customerName,
  customerAddress,
  pricing,
  hasVat,
}: CommercialPreviewCardProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();

  const lines = linesForReport(pricing);
  const breakdown = pricingVatBreakdown(lines, hasVat ? VAT_RATE_PERCENT : 0);
  const statusLabel = documentStatusLabel(kind, effectiveStatus({ kind, status, dueDate }));
  const kindLabel = kind === 'invoice' ? t('documents.kindPillInvoice') : t('documents.kindPillQuote');
  const numberLabel =
    number?.trim() ||
    (kind === 'invoice' ? t('documents.kindInvoice') : t('documents.kindQuote'));

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.md + 3,
        },
      ]}
    >
      <View style={styles.kindRow}>
        <Text
          variant="caption"
          color={colors.accentPressed}
          style={styles.kindLabel}
          numberOfLines={1}
        >
          {kindLabel}
        </Text>
        <Text variant="caption" color={colors.textSecondary} style={styles.statusLabel} numberOfLines={1}>
          {statusLabel}
        </Text>
      </View>

      <Text style={styles.docNumber} numberOfLines={1}>
        {numberLabel}
      </Text>

      <Text variant="caption" color={colors.textSecondary} style={styles.preparedFor}>
        {t('preview.preparedFor')}
      </Text>
      <Text variant="bodySmall" style={styles.customerName} numberOfLines={1}>
        {customerName?.trim() || t('documents.editor.noCustomer')}
      </Text>
      {customerAddress?.trim() ? (
        <Text variant="caption" color={colors.textSecondary} style={styles.address} numberOfLines={2}>
          {customerAddress.trim()}
        </Text>
      ) : null}

      <View style={[styles.divider, { backgroundColor: colors.border, marginTop: spacing.md }]} />

      {title.trim() ? (
        <Text style={styles.jobTitle} numberOfLines={2}>
          {title.trim()}
        </Text>
      ) : null}

      <View style={[styles.colHeader, { marginTop: title.trim() ? spacing.md : spacing.sm }]}>
        <Text variant="caption" color={colors.textSecondary} style={styles.colHint}>
          {t('preview.columnDescription')}
        </Text>
        <Text variant="caption" color={colors.textSecondary} style={[styles.colHint, styles.amountCol]}>
          {t('preview.columnAmount')}
        </Text>
      </View>

      {lines.length === 0 ? (
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
          {t('pricing.emptyHint')}
        </Text>
      ) : (
        lines.map((line, index) => {
          const pence = parseAmountToPence(line.amount);
          return (
            <View key={line.id}>
              {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
              <View style={styles.lineRow}>
                <View style={styles.lineCopy}>
                  <Text style={styles.lineTitle} numberOfLines={2}>
                    {line.description.trim() || '—'}
                  </Text>
                  <Text variant="caption" color={colors.textSecondary} style={styles.lineHint} numberOfLines={1}>
                    {categoryHint(t, line.category)}
                  </Text>
                </View>
                <Text style={[styles.lineAmount, styles.amountCol]}>
                  {pence === null ? '—' : formatPence(pence)}
                </Text>
              </View>
            </View>
          );
        })
      )}

      {breakdown ? (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border, marginTop: spacing.sm }]} />
          {hasVat ? (
            <View style={{ gap: 8, marginTop: spacing.sm }}>
              <TotalsRow
                label={t('costs.subtotal')}
                value={formatPence(breakdown.subtotalPence)}
                muted
              />
              <TotalsRow
                label={t('costs.vat', { rate: String(VAT_RATE_PERCENT) })}
                value={formatPence(breakdown.vatPence)}
                muted
              />
            </View>
          ) : null}
          <View style={{ marginTop: hasVat ? spacing.sm + 2 : spacing.sm }}>
            <TotalsRow
              label={t('costs.total')}
              value={formatPence(breakdown.totalPence)}
              strong
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

function TotalsRow({
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
    <View style={styles.totalsRow}>
      <Text
        style={strong ? styles.totalLabel : styles.subtotalLabel}
        color={muted ? colors.textSecondary : colors.textPrimary}
      >
        {label}
      </Text>
      <Text
        style={strong ? styles.totalValue : styles.subtotalValue}
        color={colors.textPrimary}
      >
        {value}
      </Text>
    </View>
  );
}

function categoryHint(
  t: (key: string, params?: Record<string, string | number>) => string,
  category: PricingCategory
): string {
  if (category === 'labour') return t('pricing.categoryLabour');
  if (category === 'materials') return t('pricing.categoryMaterials');
  return t('pricing.categoryOther');
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  kindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  kindLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    flex: 1,
  },
  statusLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'right',
  },
  docNumber: {
    marginTop: 6,
    fontFamily: fontFamily.semibold,
    fontSize: 21,
    lineHeight: 26,
  },
  preparedFor: {
    marginTop: 14,
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  customerName: {
    marginTop: 5,
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    lineHeight: 18,
  },
  address: {
    marginTop: 5,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 15,
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    width: '100%',
  },
  jobTitle: {
    marginTop: 14,
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 20,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  colHint: {
    fontFamily: fontFamily.medium,
    fontSize: 10.5,
    lineHeight: 13,
    flex: 1,
  },
  amountCol: {
    width: 90,
    textAlign: 'right',
    flexGrow: 0,
    flexShrink: 0,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 8,
  },
  lineCopy: {
    flex: 1,
    gap: 2,
  },
  lineTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 15,
  },
  lineHint: {
    fontFamily: fontFamily.regular,
    fontSize: 10.5,
    lineHeight: 13,
  },
  lineAmount: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 15,
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  subtotalLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 15,
  },
  subtotalValue: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 15,
  },
  totalLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 20,
  },
  totalValue: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 23,
  },
});

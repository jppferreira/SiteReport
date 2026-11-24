import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BottomSheet, SegmentedControl, Text, TextButton } from '@/components';
import { PricingReference, PricingReferenceHandle } from '@/features/jobs/PricingReference';
import {
  DocumentType,
  documentTypeRequiresPro,
  dueDateFromJob,
  formatPence,
  groupPricingLines,
  linesForReport,
  parseAmountToPence,
  PRICING_CATEGORIES,
  PRICING_CATEGORY_LABELS,
  pricingVatBreakdown,
  ReportPricing,
  VAT_RATE_PERCENT,
} from '@/models';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { formatDate } from '@/utils/format';

type InvoiceMeta = {
  invoiceNumber: string | null;
  dueDays: number;
  jobDate: string;
  bankName: string | null;
  sortCode: string | null;
  accountNumber: string | null;
  paymentTerms: string | null;
  hasVat: boolean;
};

type CostsDocumentCardProps = {
  pricing: ReportPricing;
  documentType: DocumentType;
  isPro: boolean;
  invoice: InvoiceMeta;
  pricingRef: React.RefObject<PricingReferenceHandle | null>;
  onSavePricing: (pricing: ReportPricing) => Promise<ReportPricing>;
  onChangeDocumentType: (type: DocumentType) => void;
  onLocked: () => void;
  /** When false, the parent owns the Notes / Reference / Quote / Invoice control. */
  showTypeControl?: boolean;
};

export function CostsDocumentCard({
  pricing,
  documentType,
  isPro,
  invoice,
  pricingRef,
  onSavePricing,
  onChangeDocumentType,
  onLocked,
  showTypeControl = true,
}: CostsDocumentCardProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);

  const lines = useMemo(() => linesForReport(pricing), [pricing]);
  const groups = useMemo(() => groupPricingLines(lines), [lines]);
  const includeVat = documentType !== 'reference' && invoice.hasVat;
  const breakdown = useMemo(
    () => pricingVatBreakdown(lines, includeVat ? VAT_RATE_PERCENT : 0),
    [lines, includeVat]
  );

  const chooseType = (key: string) => {
    const next = key as DocumentType;
    if (next === documentType) return;
    if (documentTypeRequiresPro(next) && !isPro) {
      onLocked();
      return;
    }
    onChangeDocumentType(next);
  };

  const caption =
    documentType === 'reference'
      ? t('costs.captionReference')
      : t('costs.captionTyped');

  const dueLabel = (() => {
    const due = dueDateFromJob(invoice.jobDate, invoice.dueDays);
    try {
      return t('costs.dueIn', {
        days: String(invoice.dueDays),
        date: formatDate(due),
      });
    } catch {
      return `In ${invoice.dueDays} days · ${due}`;
    }
  })();

  const bankLabel = [invoice.bankName, invoice.sortCode].filter(Boolean).join(' · ');

  return (
    <View style={{ gap: spacing.md }}>
      {showTypeControl ? (
        <View style={{ gap: spacing.sm }}>
          <SegmentedControl
            segments={[
              { key: 'reference', label: t('costs.typeReference') },
              { key: 'quote', label: t('costs.typeQuote') },
              { key: 'invoice', label: t('costs.typeInvoice') },
            ]}
            value={documentType}
            onChange={chooseType}
          />
          <Text variant="caption" color={colors.textSecondary} style={{ textAlign: 'center' }}>
            {caption}
          </Text>
        </View>
      ) : null}

      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="bodyMedium">{t('costs.priceLines')}</Text>
          <TextButton label={t('costs.edit')} tone="accent" onPress={() => setEditing(true)} />
        </View>

        {lines.length === 0 ? (
          <Text variant="caption" color={colors.textSecondary}>
            {t('pricing.emptyHint')}
          </Text>
        ) : (
          PRICING_CATEGORIES.map((category) => {
            const group = groups[category];
            if (!group?.length) return null;
            return (
              <View key={category} style={{ gap: 6 }}>
                <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 1, fontWeight: '700' }}>
                  {PRICING_CATEGORY_LABELS[category].toUpperCase()}
                </Text>
                {group.map((line) => {
                  const value = parseAmountToPence(line.amount);
                  const amountLabel = value === null ? '—' : formatPence(value);
                  return (
                    <View key={line.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                      <Text variant="body" style={{ flex: 1 }} numberOfLines={2}>
                        {line.description.trim() || '—'}
                      </Text>
                      <Text variant="bodyMedium">{amountLabel}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}

        {breakdown ? (
          <View style={{ gap: 6, marginTop: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
            {includeVat ? (
              <>
                <Row label={t('costs.subtotal')} value={formatPence(breakdown.subtotalPence)} muted />
                <Row label={t('costs.vat', { rate: String(VAT_RATE_PERCENT) })} value={formatPence(breakdown.vatPence)} muted />
              </>
            ) : null}
            <Row label={t('costs.total')} value={formatPence(breakdown.totalPence)} strong />
          </View>
        ) : null}
      </View>

      {documentType === 'invoice' ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.lg,
            padding: spacing.md,
            gap: spacing.sm,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="bodyMedium">{t('costs.invoiceDetails')}</Text>
            <View
              style={{
                backgroundColor: colors.accentSoft,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
              }}
            >
              <Text variant="caption" color={colors.accent} style={{ fontWeight: '700', letterSpacing: 0.8 }}>
                {t('costs.invoicePill')}
              </Text>
            </View>
          </View>
          <MetaRow icon="pricetag-outline" label={t('costs.invoiceNo')} value={invoice.invoiceNumber ?? t('costs.invoicePending')} />
          <MetaRow icon="calendar-outline" label={t('costs.due')} value={dueLabel} />
          {bankLabel ? <MetaRow icon="business-outline" label={t('costs.bank')} value={bankLabel} /> : null}
          <View style={{ backgroundColor: colors.surfaceSunken, borderRadius: radius.md, padding: spacing.sm, marginTop: 4 }}>
            <Text variant="caption" color={colors.textTertiary} style={{ fontWeight: '700', letterSpacing: 1 }}>
              {t('costs.paymentTerms')}
            </Text>
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
              {invoice.paymentTerms?.trim() ||
                t('costs.paymentTermsDefault', {
                  days: String(invoice.dueDays),
                  account: invoice.accountNumber ?? '—',
                  invoice: invoice.invoiceNumber ?? 'INV',
                })}
            </Text>
          </View>
        </View>
      ) : null}

      <BottomSheet visible={editing} onClose={() => setEditing(false)}>
        <Text variant="h3" style={{ marginBottom: spacing.md }}>
          {t('costs.editPrices')}
        </Text>
        <PricingReference ref={pricingRef} pricing={pricing} onSave={onSavePricing} />
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

function Row({
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
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant={strong ? 'bodyMedium' : 'body'} color={muted ? colors.textSecondary : colors.textPrimary}>
        {label}
      </Text>
      <Text variant={strong ? 'h3' : 'bodyMedium'} color={colors.textPrimary}>
        {value}
      </Text>
    </View>
  );
}

function MetaRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Ionicons name={icon} size={17} color={colors.textSecondary} />
      <Text variant="body" color={colors.textSecondary}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ flex: 1, textAlign: 'right' }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

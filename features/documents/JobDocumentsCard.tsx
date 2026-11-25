import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components';
import type { DocumentKind, TradeDocument } from '@/models';
import { formatPence } from '@/models';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { formatDateShort } from '@/utils/format';

import { DocProBadge } from './DocProBadge';
import { DocStatusBadge } from './DocStatusBadge';
import { DocTypeTile } from './DocTypeTile';

type TimelineStep = {
  kind: DocumentKind;
  label: string;
  doc: TradeDocument | null;
  state: 'done' | 'active' | 'idle';
};

type JobDocumentsCardProps = {
  documents: TradeDocument[];
  isPro: boolean;
  onNew: () => void;
  onOpenDocument: (id: string) => void;
  onCreateKind: (kind: DocumentKind) => void;
  onCreateReport: () => void;
  onPreviewReport: () => void;
  onConvertQuote: (quoteId: string) => void;
  onMarkPaid: (invoiceId: string) => void;
  onRemind?: (invoiceId: string) => void;
};

const KIND_ORDER: DocumentKind[] = ['quote', 'report', 'invoice'];

function stepComplete(kind: DocumentKind, doc: TradeDocument | null): boolean {
  if (!doc) return false;
  if (kind === 'quote') return doc.status === 'accepted' || doc.status === 'declined';
  if (kind === 'report') return doc.status === 'sent' || Boolean(doc.localPdfUri);
  if (kind === 'invoice') return doc.status === 'paid';
  return false;
}

function metaForStep(doc: TradeDocument | null, kind: DocumentKind, t: (key: string) => string): string {
  if (!doc) return t('documents.stepCreateAnytime');
  const bits: string[] = [];
  if (doc.totalPence != null) bits.push(formatPence(doc.totalPence));
  if (kind === 'quote' && doc.acceptedAt) bits.push(formatDateShort(doc.acceptedAt));
  else if (kind === 'invoice' && doc.dueDate) bits.push(formatDateShort(doc.dueDate));
  else if (doc.updatedAt) bits.push(formatDateShort(doc.updatedAt));
  return bits.length > 0 ? bits.join(' · ') : '—';
}

export function JobDocumentsCard({
  documents,
  isPro,
  onNew,
  onOpenDocument,
  onCreateKind,
  onCreateReport,
  onPreviewReport,
  onConvertQuote,
  onMarkPaid,
  onRemind,
}: JobDocumentsCardProps) {
  const { colors, radius, spacing, shadows } = useTheme();
  const { t } = useI18n();

  const byKind = useMemo(() => {
    const map: Partial<Record<DocumentKind, TradeDocument>> = {};
    for (const kind of KIND_ORDER) {
      const match = documents.find((d) => d.kind === kind);
      if (match) map[kind] = match;
    }
    return map;
  }, [documents]);

  const steps: TimelineStep[] = useMemo(() => {
    const labels: Record<DocumentKind, string> = {
      quote: t('documents.kindQuote'),
      report: t('documents.kindReport'),
      invoice: t('documents.kindInvoice'),
    };

    return KIND_ORDER.map((kind) => {
      const doc = byKind[kind] ?? null;
      const done = stepComplete(kind, doc);
      const state: TimelineStep['state'] = done ? 'done' : doc ? 'active' : 'idle';
      const title =
        doc?.number != null
          ? `${labels[kind]} ${doc.number}`
          : kind === 'report'
            ? t('documents.jobReportLabel')
            : labels[kind];
      return { kind, label: title, doc, state };
    });
  }, [byKind, t]);

  const acceptedQuote = byKind.quote?.status === 'accepted' ? byKind.quote : null;
  const canConvert = Boolean(acceptedQuote) && !byKind.invoice;

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          backgroundColor: colors.surface,
          borderColor: '#BFE5CB',
          borderRadius: radius.xl,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.md + 2,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text variant="h3">{t('documents.jobCardTitle')}</Text>
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
            {t('documents.jobCardSubtitle')}
          </Text>
        </View>
        <Pressable
          onPress={onNew}
          accessibilityRole="button"
          accessibilityLabel={t('documents.new')}
          style={({ pressed }) => [
            styles.newPill,
            {
              backgroundColor: colors.accentSoft,
              borderRadius: radius.pill,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="add" size={17} color={colors.accentPressed} />
          <Text variant="bodySmall" color={colors.accentPressed} style={styles.newLabel}>
            {t('documents.new')}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.timeline, { marginTop: spacing.md }]}>
        {steps.map((step, index) => (
          <TimelineRow
            key={step.kind}
            step={step}
            isLast={index === steps.length - 1}
            isPro={isPro}
            showConvert={step.kind === 'invoice' && canConvert && Boolean(acceptedQuote)}
            convertQuoteId={acceptedQuote?.id ?? null}
            meta={metaForStep(step.doc, step.kind, t)}
            onOpen={() => step.doc && onOpenDocument(step.doc.id)}
            onCreateKind={onCreateKind}
            onCreateReport={onCreateReport}
            onPreviewReport={onPreviewReport}
            onConvertQuote={onConvertQuote}
            onMarkPaid={onMarkPaid}
            onRemind={onRemind}
          />
        ))}
      </View>
    </View>
  );
}

type TimelineRowProps = {
  step: TimelineStep;
  isLast: boolean;
  isPro: boolean;
  showConvert: boolean;
  convertQuoteId: string | null;
  meta: string;
  onOpen: () => void;
  onCreateKind: (kind: DocumentKind) => void;
  onCreateReport: () => void;
  onPreviewReport: () => void;
  onConvertQuote: (quoteId: string) => void;
  onMarkPaid: (invoiceId: string) => void;
  onRemind?: (invoiceId: string) => void;
};

function TimelineRow({
  step,
  isLast,
  isPro,
  showConvert,
  convertQuoteId,
  meta,
  onOpen,
  onCreateKind,
  onCreateReport,
  onPreviewReport,
  onConvertQuote,
  onMarkPaid,
  onRemind,
}: TimelineRowProps) {
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();
  const { doc, state, kind } = step;
  const showPro = kind !== 'report';
  const needsCreate = !doc;
  const locked = showPro && !isPro && needsCreate;

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        {state === 'done' ? (
          <View style={[styles.nodeFill, { backgroundColor: colors.accent }]}>
            <Ionicons name="checkmark" size={14} color={colors.accentOnAccent} />
          </View>
        ) : state === 'active' ? (
          <View style={[styles.nodeNow, { borderColor: colors.accent, backgroundColor: colors.surface }]}>
            <View style={[styles.nodeNowDot, { backgroundColor: colors.accent }]} />
          </View>
        ) : (
          <View style={[styles.nodeTodo, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]} />
        )}
        {!isLast ? (
          <View
            style={[
              styles.line,
              { backgroundColor: state === 'done' ? colors.accent : colors.border },
            ]}
          />
        ) : null}
      </View>

      <View style={[styles.stepBody, { paddingBottom: isLast ? 0 : spacing.md }]}>
        <Pressable onPress={doc ? onOpen : undefined} disabled={!doc} style={styles.stepTitle}>
          <DocTypeTile kind={kind} size={44} />
          <View style={[styles.flex, { marginLeft: spacing.sm }]}>
            <View style={styles.titleRow}>
              <Text
                variant="bodyMedium"
                color={doc ? colors.textPrimary : colors.textSecondary}
                numberOfLines={1}
                style={styles.flex}
              >
                {step.label}
              </Text>
              {showPro ? <DocProBadge /> : null}
            </View>
            <View style={[styles.metaRow, { marginTop: 4 }]}>
              {doc ? <DocStatusBadge document={doc} /> : null}
              <Text variant="caption" color={colors.textSecondary} numberOfLines={1} style={styles.flex}>
                {meta}
              </Text>
            </View>
          </View>
        </Pressable>

        {needsCreate && kind === 'quote' ? (
          <View style={[styles.actions, { marginTop: spacing.sm }]}>
            <Button
              label={t('documents.actionCreateQuote')}
              onPress={() => onCreateKind('quote')}
              variant="accent"
              fullWidth={false}
              style={styles.primaryAction}
            />
          </View>
        ) : null}

        {needsCreate && kind === 'invoice' ? (
          <View style={[styles.actions, { marginTop: spacing.sm }]}>
            <Button
              label={t('documents.actionCreateInvoice')}
              onPress={() => onCreateKind('invoice')}
              variant="accent"
              fullWidth={false}
              style={styles.primaryAction}
            />
          </View>
        ) : null}

        {kind === 'report' && !stepComplete('report', doc) ? (
          <View style={[styles.actions, { marginTop: spacing.sm }]}>
            <Button
              label={t('documents.actionCreateReport')}
              onPress={onCreateReport}
              variant="accent"
              fullWidth={false}
              icon={<Ionicons name="document-text-outline" size={17} color={colors.accentOnAccent} />}
              style={styles.primaryAction}
            />
            <Pressable
              onPress={onPreviewReport}
              style={({ pressed }) => [
                styles.ghostBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.pill,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text variant="bodySmall" style={styles.ghostLabel}>
                {t('documents.actionPreview')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {kind === 'invoice' && doc && (doc.status === 'unpaid' || doc.status === 'sent') ? (
          <View style={[styles.actions, { marginTop: spacing.sm }]}>
            <Button
              label={t('documents.actionMarkPaid')}
              onPress={() => onMarkPaid(doc.id)}
              variant="accent"
              fullWidth={false}
              style={styles.primaryAction}
            />
            {onRemind ? (
              <Pressable
                onPress={() => onRemind(doc.id)}
                style={({ pressed }) => [
                  styles.ghostBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.pill,
                    opacity: pressed ? 0.85 : 1,
                    flexDirection: 'row',
                    gap: 6,
                  },
                ]}
              >
                <Ionicons name="notifications-outline" size={16} color={colors.textPrimary} />
                <Text variant="bodySmall" style={styles.ghostLabel}>
                  {t('documents.actionRemind')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {showConvert && convertQuoteId ? (
          <View style={[styles.actions, { marginTop: spacing.sm }]}>
            <Pressable
              onPress={() => onConvertQuote(convertQuoteId)}
              style={({ pressed }) => [
                styles.ghostBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.pill,
                  opacity: pressed ? 0.85 : 1,
                  flexDirection: 'row',
                  gap: 6,
                },
              ]}
            >
              <Ionicons name="swap-horizontal-outline" size={16} color={colors.textPrimary} />
              <Text variant="bodySmall" style={styles.ghostLabel}>
                {t('documents.actionConvert')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {locked ? (
          <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.xs }}>
            {t('documents.proRequiredHint')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  newPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingLeft: 10,
    paddingRight: 14,
    gap: 4,
  },
  newLabel: { fontWeight: '600' },
  timeline: {},
  row: { flexDirection: 'row' },
  rail: { width: 26, alignItems: 'center' },
  nodeFill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeNow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeNowDot: { width: 8, height: 8, borderRadius: 4 },
  nodeTodo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
  },
  line: { width: 2, flex: 1, minHeight: 20, marginTop: 4, borderRadius: 1 },
  stepBody: { flex: 1, minWidth: 0 },
  stepTitle: { flexDirection: 'row', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 0 },
  primaryAction: { minWidth: undefined, alignSelf: 'flex-start' },
  ghostBtn: {
    height: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  ghostLabel: { fontWeight: '600' },
});

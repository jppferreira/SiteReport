import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  ErrorState,
  LoadingState,
  NavigationHeader,
  Screen,
  Text,
  useToast,
} from '@/components';
import { documentsRepository, workSummaryRepository } from '@/database';
import { CommercialTemplatePicker } from '@/features/documents/CommercialTemplatePicker';
import { DidYouSendItSheet } from '@/features/documents/DidYouSendItSheet';
import { HtmlReportPreview } from '@/features/reports/HtmlReportPreview';
import { useI18n } from '@/i18n/useI18n';
import {
  DEFAULT_COMMERCIAL_TEMPLATE,
  DEFAULT_REPORT_TEMPLATE,
  documentRequiresPro,
  normalizeCommercialTemplateId,
  type CommercialTemplateId,
  type TradeDocument,
} from '@/models';
import { hasProAccess } from '@/services/entitlementService';
import {
  buildReportPreviewHtml,
  generateReportPdf,
  loadReportDocument,
  ReportDocument,
  ReportGenerationError,
} from '@/services/pdfService';
import { getPreferences, savePreferences } from '@/services/preferencesService';
import { shareFile } from '@/services/shareService';
import { useTheme } from '@/theme';
import { goBack } from '@/utils/goBack';
import { logger } from '@/utils/logger';

/**
 * Figma S3a — quote / invoice preview before sending.
 * Live HTML preview with Classic / Bold / Minimal template switching.
 */
export default function CommercialDocumentPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [doc, setDoc] = useState<TradeDocument | null>(null);
  const [reportDoc, setReportDoc] = useState<ReportDocument | null>(null);
  const [commercialTemplate, setCommercialTemplate] =
    useState<CommercialTemplateId>(DEFAULT_COMMERCIAL_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [didYouSendOpen, setDidYouSendOpen] = useState(false);
  const [confirmingSent, setConfirmingSent] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await documentsRepository.getDocument(id);
      setDoc(result);
      if (!result || (result.kind !== 'quote' && result.kind !== 'invoice')) {
        setReportDoc(null);
        return;
      }

      const summary = await workSummaryRepository.getWorkSummary(result.jobId);
      if (summary?.documentType !== result.kind) {
        await workSummaryRepository.saveWorkSummary(result.jobId, {
          documentType: result.kind,
          pricing: summary?.pricing ?? { enabled: true, lines: [] },
        });
      }

      const [loaded, preferences] = await Promise.all([
        loadReportDocument(result.jobId, { useJobAddressOnly: true }),
        getPreferences(),
      ]);
      setReportDoc(loaded);
      setCommercialTemplate(normalizeCommercialTemplateId(preferences.commercialTemplate));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const isInvoice = doc?.kind === 'invoice';
  const kind = isInvoice ? 'invoice' : 'quote';

  const screenTitle = isInvoice ? t('preview.invoiceTitle') : t('preview.quoteTitle');
  const checkHint = isInvoice ? t('preview.checkInvoice') : t('preview.checkQuote');
  const sendLabel = isInvoice ? t('preview.sendInvoice') : t('preview.sendQuote');
  const customerName = reportDoc?.htmlInput.job.customerName ?? null;
  const firstName = customerFirstName(customerName, t('preview.customerFallback'));
  const reviewHint =
    doc?.sentAt || (doc && doc.status !== 'draft')
      ? t('preview.reviewSentHint', { name: firstName })
      : t('preview.reviewHint', { name: firstName });

  const html = useMemo(() => {
    if (!reportDoc) return '';
    return buildReportPreviewHtml({
      ...reportDoc.htmlInput,
      template: DEFAULT_REPORT_TEMPLATE,
      commercialTemplate,
      documentType: kind,
    });
  }, [reportDoc, commercialTemplate, kind]);

  const handleTemplateChange = (next: CommercialTemplateId) => {
    setCommercialTemplate(next);
    void savePreferences({ commercialTemplate: next });
  };

  const handleEdit = () => {
    if (!doc) return;
    router.push({ pathname: '/document/edit', params: { id: doc.id } });
  };

  const handleSend = async () => {
    if (!doc) return;
    setSending(true);
    try {
      if (documentRequiresPro(doc.kind) && !(await hasProAccess())) {
        router.push({ pathname: '/paywall', params: { trigger: 'quote_invoice' } });
        return;
      }

      await savePreferences({ commercialTemplate });
      await workSummaryRepository.saveWorkSummary(doc.jobId, { documentType: kind });
      const report = await generateReportPdf(doc.jobId, DEFAULT_REPORT_TEMPLATE);
      const shared = await shareFile(report.localPdfUri, report.fileName ?? undefined);
      if (!shared) {
        showToast({ message: t('documents.toastShareError'), tone: 'destructive' });
        return;
      }
      const refreshed = await documentsRepository.getDocument(doc.id);
      if (refreshed) setDoc(refreshed);
      if (needsSentConfirm(refreshed ?? doc)) {
        setDidYouSendOpen(true);
      }
    } catch (error) {
      logger.error('Commercial document send failed', error);
      showToast({
        message:
          error instanceof ReportGenerationError
            ? error.message
            : t('documents.toastShareError'),
        tone: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleConfirmSent = async () => {
    if (!doc) return;
    setConfirmingSent(true);
    try {
      await documentsRepository.markSent(doc.id);
      setDidYouSendOpen(false);
      showToast({ message: t('documents.toastMarkedSent'), tone: 'success' });
      await load();
    } catch {
      showToast({ message: t('documents.toastUpdateError'), tone: 'destructive' });
    } finally {
      setConfirmingSent(false);
    }
  };

  if (loading && !doc) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <NavigationHeader title={screenTitle} onBack={() => goBack('/(tabs)/jobs')} />
        <LoadingState label={t('preview.preparing')} />
      </Screen>
    );
  }

  if (!doc || (doc.kind !== 'quote' && doc.kind !== 'invoice')) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <NavigationHeader title={screenTitle} onBack={() => goBack('/(tabs)/jobs')} />
        <ErrorState title={t('documents.notFound')} onAction={() => void load()} />
      </Screen>
    );
  }

  const footerPad = Math.max(insets.bottom, spacing.md);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <NavigationHeader title={screenTitle} onBack={() => goBack(`/document/${doc.id}`)} />

      <View style={[styles.body, { backgroundColor: colors.surfaceSunken }]}>
        <Text
          variant="label"
          color={colors.textSecondary}
          style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}
        >
          {checkHint}
        </Text>
        <View style={styles.preview}>
          {loading || !reportDoc ? (
            <LoadingState label={t('preview.preparing')} />
          ) : (
            <HtmlReportPreview html={html} />
          )}
        </View>
      </View>

      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: footerPad,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            gap: spacing.sm,
          },
        ]}
      >
        <CommercialTemplatePicker
          value={commercialTemplate}
          onChange={handleTemplateChange}
          accentColor={colors.accentPressed}
        />
        <Text variant="caption" color={colors.textSecondary} style={styles.reviewHint}>
          {reviewHint}
        </Text>
        <View style={[styles.actions, { gap: spacing.sm }]}>
          <Button
            variant="secondary"
            label={t('documents.actionEdit')}
            icon={<Ionicons name="create-outline" size={20} color={colors.textPrimary} />}
            onPress={handleEdit}
            disabled={sending}
            fullWidth={false}
            style={{
              ...styles.editBtn,
              borderRadius: radius.pill,
              borderWidth: 1.5,
            }}
          />
          <Button
            variant="accent"
            label={sendLabel}
            icon={<Ionicons name="paper-plane-outline" size={20} color={colors.textInverse} />}
            onPress={() => void handleSend()}
            loading={sending}
            disabled={sending}
            fullWidth={false}
            style={{
              ...styles.sendBtn,
              borderRadius: radius.pill,
              backgroundColor: colors.accentPressed,
            }}
          />
        </View>
      </View>

      <DidYouSendItSheet
        visible={didYouSendOpen}
        documentNumber={doc.number}
        loading={confirmingSent}
        onClose={() => setDidYouSendOpen(false)}
        onConfirmSent={() => void handleConfirmSent()}
      />
    </Screen>
  );
}

function customerFirstName(name: string | null, fallback: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function needsSentConfirm(document: TradeDocument): boolean {
  return document.status === 'draft' || !document.sentAt;
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  preview: {
    flex: 1,
    marginTop: 8,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reviewHint: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '400',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
    width: 112,
    flexGrow: 0,
    flexShrink: 0,
  },
  sendBtn: {
    flex: 1,
  },
});

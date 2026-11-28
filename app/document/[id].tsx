import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  ErrorState,
  IconButton,
  LoadingState,
  NavigationHeader,
  Screen,
  Text,
  useToast,
} from '@/components';
import {
  businessProfileRepository,
  customersRepository,
  documentsRepository,
  jobsRepository,
} from '@/database';
import {
  ConvertQuoteSheet,
  DidYouSendItSheet,
  DocPdfThumb,
  DocStatusBadge,
  MarkPaidSheet,
  SendReminderSheet,
  type ReminderChannel,
} from '@/features/documents';
import { BottomSheetMenu } from '@/features/jobs/BottomSheetMenu';
import { useTabletBreakpoint } from '@/hooks/useTabletBreakpoint';
import { useI18n } from '@/i18n/useI18n';
import {
  effectiveStatus,
  formatInvoiceNumber,
  formatPence,
  isOverdue,
  pricingTotalsFromSnapshot,
  TradeDocument,
} from '@/models';
import {
  buildPaymentReminderMessage,
  cancelDocumentReminders,
  sharePaymentReminder,
  syncRemindersForDocument,
} from '@/services/documentReminders';
import { composeReportEmail } from '@/services/mailComposer';
import { openLocalFile, shareFile } from '@/services/shareService';
import { useTheme } from '@/theme';
import { getLayoutTokens } from '@/theme/layoutTokens';
import { formatDateShort } from '@/utils/format';
import { goBack } from '@/utils/goBack';

type TimelineNodeState = 'done' | 'alert' | 'todo';

type TimelineEvent = {
  key: string;
  label: string;
  detail?: string;
  state: TimelineNodeState;
  isLast: boolean;
};

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { spacing, colors, radius, shadows } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const breakpoint = useTabletBreakpoint();
  const layout = getLayoutTokens(breakpoint);
  const [doc, setDoc] = useState<TradeDocument | null>(null);
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [didYouSendOpen, setDidYouSendOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [nextInvoicePreview, setNextInvoicePreview] = useState('INV-0001');
  const [defaultDueDays, setDefaultDueDays] = useState(14);
  const [hasReport, setHasReport] = useState(false);
  const [hasSiblingInvoice, setHasSiblingInvoice] = useState(false);
  const [profileHasVat, setProfileHasVat] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await documentsRepository.getDocument(id);
      setDoc(result);
      if (result) {
        const [job, profile, siblings] = await Promise.all([
          jobsRepository.getJob(result.jobId),
          businessProfileRepository.getBusinessProfile(),
          documentsRepository.listDocumentsForJob(result.jobId),
        ]);
        setJobTitle(job?.title ?? null);
        setCustomerName(job?.customerName ?? null);
        setNextInvoicePreview(formatInvoiceNumber(profile.nextInvoiceSequence));
        setDefaultDueDays(profile.defaultDueDays ?? 14);
        setProfileHasVat(Boolean(profile.vatNumber?.trim()));
        setHasReport(siblings.some((d) => d.kind === 'report'));
        setHasSiblingInvoice(siblings.some((d) => d.kind === 'invoice' && d.id !== result.id));
        if (job?.customerId) {
          const customer = await customersRepository.getCustomer(job.customerId);
          setCustomerEmail(customer?.email ?? null);
        } else {
          setCustomerEmail(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const runAction = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch {
      showToast({ message: t('documents.toastUpdateError'), tone: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !doc) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <NavigationHeader title={t('documents.detailTitle')} onBack={() => goBack('/(tabs)/jobs')} />
        <LoadingState />
      </Screen>
    );
  }

  if (!doc) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <NavigationHeader title={t('documents.detailTitle')} onBack={() => goBack('/(tabs)/jobs')} />
        <ErrorState title={t('documents.notFound')} onAction={load} />
      </Screen>
    );
  }

  const kindLabel =
    doc.kind === 'quote'
      ? t('documents.kindQuote')
      : doc.kind === 'invoice'
        ? t('documents.kindInvoice')
        : t('documents.kindReport');

  const needsSentConfirm = (document: TradeDocument) => {
    if (document.kind === 'invoice') {
      return document.status === 'draft' || !document.sentAt;
    }
    if (document.kind === 'quote') {
      return document.status === 'draft' || !document.sentAt;
    }
    return document.status === 'draft' || !document.sentAt;
  };

  const handleShare = async () => {
    if (!doc.localPdfUri) {
      showToast({ message: t('documents.toastNoPdf'), tone: 'neutral' });
      return;
    }
    try {
      const shared = await shareFile(doc.localPdfUri, doc.fileName ?? 'document.pdf');
      if (!shared) {
        showToast({ message: t('documents.toastShareError'), tone: 'destructive' });
        return;
      }
      if (needsSentConfirm(doc)) {
        setDidYouSendOpen(true);
      }
    } catch {
      showToast({ message: t('documents.toastShareError'), tone: 'destructive' });
    }
  };

  const handleConfirmSent = async () => {
    setBusy(true);
    try {
      await documentsRepository.markSent(doc.id);
      setDidYouSendOpen(false);
      showToast({ message: t('documents.toastMarkedSent'), tone: 'success' });
      await load();
    } catch {
      showToast({ message: t('documents.toastUpdateError'), tone: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const openRemindSheet = async () => {
    try {
      const profile = await businessProfileRepository.getBusinessProfile();
      setReminderMessage(
        buildPaymentReminderMessage({
          document: doc,
          customerName,
          jobTitle,
          profile,
        })
      );
      setRemindOpen(true);
    } catch {
      showToast({ message: t('reminders.toastShareUnavailable'), tone: 'destructive' });
    }
  };

  const handleSendReminder = async (opts: {
    message: string;
    channel: ReminderChannel;
    remindAgain: boolean;
  }) => {
    setBusy(true);
    try {
      const profile = await businessProfileRepository.getBusinessProfile();
      const ctx = { document: doc, customerName, jobTitle, profile };

      if (opts.channel === 'email') {
        if (!doc.localPdfUri) {
          showToast({ message: t('documents.toastNoPdf'), tone: 'neutral' });
          return;
        }
        const result = await composeReportEmail({
          recipientEmail: customerEmail,
          subject: t('reminders.shareInvoiceLine', {
            number: doc.number ?? '—',
            amount: doc.totalPence != null ? formatPence(doc.totalPence) : '—',
            due: doc.dueDate ? formatDateShort(doc.dueDate) : '—',
          }),
          body: opts.message,
          pdfUri: doc.localPdfUri,
          fileName: doc.fileName ?? 'invoice.pdf',
        });
        if (result.outcome === 'cancelled') return;
        if (result.outcome === 'unavailable') {
          showToast({ message: result.message, tone: 'warning' });
          return;
        }
        showToast({
          message:
            result.outcome === 'shared' ? result.message : t('documents.toastReminderEmailOpened'),
          tone: 'success',
        });
      } else {
        const result = await sharePaymentReminder(ctx, opts.message);
        if (result === 'cancelled') return;
        if (result === 'unavailable') {
          showToast({ message: t('reminders.toastShareUnavailable'), tone: 'warning' });
          return;
        }
        showToast({ message: t('documents.toastReminderSent'), tone: 'success' });
      }

      if (opts.remindAgain) {
        await syncRemindersForDocument(doc, { jobTitle });
      } else {
        await cancelDocumentReminders(doc.id);
      }
      setRemindOpen(false);
    } catch {
      showToast({ message: t('reminders.toastShareUnavailable'), tone: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handlePreview = async () => {
    if (doc.kind === 'quote' || doc.kind === 'invoice') {
      router.push({ pathname: '/document/preview', params: { id: doc.id } });
      return;
    }
    if (!doc.localPdfUri) return;
    try {
      await openLocalFile(doc.localPdfUri);
    } catch {
      showToast({ message: t('documents.toastOpenError'), tone: 'destructive' });
    }
  };

  const handleMarkPaid = async (opts: {
    amountPence: number;
    paidAt: string;
    method: string;
    thankYou: boolean;
  }) => {
    setBusy(true);
    try {
      await documentsRepository.markPaid(doc.id, {
        paidMethod: opts.method,
        paidAmountPence: opts.amountPence,
      });
      setMarkPaidOpen(false);
      showToast({ message: t('documents.toastPaid'), tone: 'neutral' });
      await load();
    } catch {
      showToast({ message: t('documents.toastPaidError'), tone: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const overdue = isOverdue(doc);
  const eff = effectiveStatus(doc);
  const subtitleMeta = [customerName, jobTitle].filter(Boolean).join(' · ');
  const dueMeta = dueMetaForDoc(doc, overdue, t);
  const timelineEvents = buildTimelineEvents(doc, t);

  const showInvoiceActions = doc.kind === 'invoice' && doc.status !== 'paid';
  const showRemind = showInvoiceActions && (doc.status === 'unpaid' || doc.status === 'sent');
  const quoteAwaitingDecision = doc.kind === 'quote' && doc.status === 'sent';
  const showQuoteMarkAccepted = quoteAwaitingDecision;
  const canConvertQuote = doc.kind === 'quote' && doc.status === 'accepted' && !hasSiblingInvoice;
  const showSendEdit =
    (doc.kind === 'quote' && !quoteAwaitingDecision && !canConvertQuote) ||
    doc.kind === 'report' ||
    (!showInvoiceActions && doc.kind !== 'quote');
  const stickyBottom =
    showInvoiceActions || showSendEdit || showQuoteMarkAccepted || canConvertQuote;

  const renderStickyBar = () => {
    if (showInvoiceActions) {
      return (
        <View
          style={[
            styles.stickyBar,
            shadows.card,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, spacing.sm),
              paddingHorizontal: spacing.lg,
            },
          ]}
        >
          <View style={styles.stickyActions}>
            <Pressable
              onPress={() => setMarkPaidOpen(true)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('documents.actionMarkPaid')}
              style={({ pressed }) => [
                styles.markPaidBtn,
                {
                  backgroundColor: pressed ? colors.accentPressed : colors.accent,
                  borderRadius: radius.pill,
                  opacity: busy ? 0.6 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                },
              ]}
            >
              <Ionicons name="checkmark" size={18} color={colors.textInverse} />
              <Text variant="bodyMedium" color={colors.textInverse} style={styles.markPaidLabel}>
                {t('documents.actionMarkPaid')}
              </Text>
            </Pressable>
            {showRemind ? (
              <IconButton
                name="notifications-outline"
                accessibilityLabel={t('documents.actionRemind')}
                onPress={() => void openRemindSheet()}
                disabled={busy}
                variant="filled"
                style={styles.roundBtn}
              />
            ) : null}
            <IconButton
              name="create-outline"
              accessibilityLabel={t('documents.actionEdit')}
              onPress={handleEdit}
              disabled={busy}
              variant="filled"
              style={styles.roundBtn}
            />
            <IconButton
              name="share-outline"
              accessibilityLabel={t('common.share')}
              onPress={handleShare}
              disabled={busy}
              variant="filled"
              style={styles.roundBtn}
            />
          </View>
        </View>
      );
    }

    if (canConvertQuote) {
      return (
        <View
          style={[
            styles.stickyBar,
            shadows.card,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, spacing.sm),
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.sm,
            },
          ]}
        >
          <View style={styles.stickyActions}>
            <Pressable
              onPress={() => setConvertOpen(true)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('documents.actionConvert')}
              style={({ pressed }) => [
                styles.markPaidBtn,
                {
                  backgroundColor: pressed ? colors.accentPressed : colors.accent,
                  borderRadius: radius.pill,
                  opacity: busy ? 0.6 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                },
              ]}
            >
              <Ionicons name="swap-horizontal" size={18} color={colors.textInverse} />
              <Text variant="bodyMedium" color={colors.textInverse} style={styles.markPaidLabel}>
                {t('documents.actionConvert')}
              </Text>
            </Pressable>
            <IconButton
              name="create-outline"
              accessibilityLabel={t('documents.actionEdit')}
              onPress={handleEdit}
              disabled={busy}
              variant="filled"
              style={styles.roundBtn}
            />
            <IconButton
              name="share-outline"
              accessibilityLabel={t('common.share')}
              onPress={handleShare}
              disabled={busy}
              variant="filled"
              style={styles.roundBtn}
            />
          </View>
        </View>
      );
    }

    if (showQuoteMarkAccepted) {
      return (
        <View
          style={[
            styles.stickyBar,
            shadows.card,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, spacing.sm),
              paddingHorizontal: spacing.lg,
            },
          ]}
        >
          <View style={styles.stickyActions}>
            <Pressable
              onPress={() => runAction(() => documentsRepository.markAccepted(doc.id))}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('documents.actionAccepted')}
              style={({ pressed }) => [
                styles.markPaidBtn,
                {
                  backgroundColor: pressed ? colors.accentPressed : colors.accent,
                  borderRadius: radius.pill,
                  opacity: busy ? 0.6 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                },
              ]}
            >
              <Ionicons name="checkmark" size={18} color={colors.textInverse} />
              <Text variant="bodyMedium" color={colors.textInverse} style={styles.markPaidLabel}>
                {t('documents.actionAccepted')}
              </Text>
            </Pressable>
            <IconButton
              name="create-outline"
              accessibilityLabel={t('documents.actionEdit')}
              onPress={handleEdit}
              disabled={busy}
              variant="filled"
              style={styles.roundBtn}
            />
            <IconButton
              name="share-outline"
              accessibilityLabel={t('common.share')}
              onPress={handleShare}
              disabled={busy}
              variant="filled"
              style={styles.roundBtn}
            />
          </View>
        </View>
      );
    }

    if (showSendEdit) {
      return (
        <View
          style={[
            styles.stickyBar,
            shadows.card,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, spacing.sm),
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.sm,
              gap: spacing.sm,
            },
          ]}
        >
          <View style={styles.sendEditRow}>
            <View style={{ flex: 1 }}>
              <Button
                label={t('documents.actionSend')}
                variant="accent"
                icon={<Ionicons name="paper-plane-outline" size={18} color={colors.textInverse} />}
                onPress={handleSend}
                disabled={busy}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={t('documents.actionEdit')}
                variant="secondary"
                icon={<Ionicons name="create-outline" size={18} color={colors.textPrimary} />}
                onPress={handleEdit}
                disabled={busy}
              />
            </View>
          </View>
        </View>
      );
    }

    return null;
  };

  const renderSheets = () => (
    <>
      <BottomSheetMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={[
          ...(doc.kind === 'quote' || doc.kind === 'invoice' || doc.localPdfUri
            ? [
                {
                  icon: 'eye-outline' as const,
                  label: t('common.preview'),
                  onPress: () => void handlePreview(),
                },
              ]
            : []),
          ...(canConvertQuote
            ? [
                {
                  icon: 'swap-horizontal' as const,
                  label: t('documents.actionConvert'),
                  onPress: () => setConvertOpen(true),
                },
              ]
            : []),
          {
            icon: 'create-outline',
            label:
              doc.kind === 'report' ? t('documents.actionEditJob') : t('documents.actionEditPrices'),
            onPress: handleEdit,
          },
          {
            icon: 'share-outline',
            label: t('common.share'),
            onPress: handleShare,
          },
          {
            icon: 'briefcase-outline',
            label: t('documents.detailOpenJob'),
            onPress: () => router.push(`/job/${doc.jobId}`),
          },
        ]}
      />

      <ConvertQuoteSheet
        visible={convertOpen}
        quoteNumber={doc.number}
        quoteTotalPence={doc.totalPence}
        invoicePreviewNumber={nextInvoicePreview}
        invoiceTotalPence={convertInvoiceTotal}
        lineCount={convertLineCount}
        defaultDueDays={defaultDueDays}
        hasReport={hasReport}
        showVatNote={profileHasVat && (doc.vatPence ?? 0) > 0}
        standalone
        loading={busy}
        onClose={() => setConvertOpen(false)}
        onSubmit={(opts) => void handleConvertQuote(opts)}
      />

      <MarkPaidSheet
        visible={markPaidOpen}
        defaultAmountPence={doc.totalPence}
        loading={busy}
        onClose={() => setMarkPaidOpen(false)}
        onSubmit={handleMarkPaid}
      />

      <DidYouSendItSheet
        visible={didYouSendOpen}
        documentNumber={doc.number}
        loading={busy}
        onClose={() => setDidYouSendOpen(false)}
        onConfirmSent={() => void handleConfirmSent()}
      />

      <SendReminderSheet
        visible={remindOpen}
        defaultMessage={reminderMessage}
        loading={busy}
        onClose={() => setRemindOpen(false)}
        onSend={(opts) => void handleSendReminder(opts)}
      />
    </>
  );

  const convertLineCount = (() => {
    if (!doc.pricingSnapshotJson?.trim()) return 0;
    try {
      const raw = JSON.parse(doc.pricingSnapshotJson) as { lines?: unknown[] };
      return Array.isArray(raw.lines) ? raw.lines.length : 0;
    } catch {
      return 0;
    }
  })();
  const convertInvoiceTotal =
    doc.totalPence ?? pricingTotalsFromSnapshot(doc.pricingSnapshotJson ?? null).totalPence;

  const handleConvertQuote = async (opts: {
    copyPricing: boolean;
    attachReport: boolean;
    dueDays: number;
  }) => {
    setBusy(true);
    try {
      const siblings = await documentsRepository.listDocumentsForJob(doc.jobId);
      const reportDoc = siblings.find((d) => d.kind === 'report');
      const invoice = await documentsRepository.convertQuoteToInvoice(doc.id, {
        copyPricing: opts.copyPricing,
        dueDays: opts.dueDays,
        attachReportId: opts.attachReport ? reportDoc?.reportId ?? reportDoc?.id ?? null : null,
      });
      setConvertOpen(false);
      showToast({ message: t('documents.toastConverted'), tone: 'neutral' });
      router.replace(`/document/${invoice.id}`);
    } catch {
      showToast({ message: t('documents.toastConvertError'), tone: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = () => {
    if (doc.kind === 'report') {
      // Reports are edited through the guided job checklist / work screens.
      router.push(`/job/${doc.jobId}`);
      return;
    }
    // Quotes and invoices use the dedicated document editor (Figma S3).
    router.push({ pathname: '/document/edit', params: { id: doc.id } });
  };

  const handleSend = () => {
    // Draft quotes/invoices go through the S3a check-before-send preview.
    if (
      (doc.kind === 'quote' || doc.kind === 'invoice') &&
      (doc.status === 'draft' || !doc.sentAt)
    ) {
      router.push({ pathname: '/document/preview', params: { id: doc.id } });
      return;
    }
    void handleShare();
  };

  const headerContent = (
    <View style={styles.headerRow}>
      <DocPdfThumb kind={doc.kind} pdfUri={doc.localPdfUri} onPress={doc.localPdfUri ? handlePreview : undefined} />
      <View style={styles.headerMain}>
        {doc.number ? (
          <Text variant="caption" color={colors.textTertiary} style={styles.docNumber}>
            {doc.number}
          </Text>
        ) : null}
        {doc.totalPence != null ? (
          <Text variant="display" style={styles.amount}>
            {formatPence(doc.totalPence)}
          </Text>
        ) : null}
        <View style={styles.badgeRow}>
          <DocStatusBadge document={doc} />
          {dueMeta ? (
            <Text variant="caption" color={overdue ? colors.destructive : colors.textSecondary}>
              {dueMeta}
            </Text>
          ) : null}
        </View>
        {subtitleMeta ? (
          <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={2} style={{ marginTop: 6 }}>
            {subtitleMeta}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const timelineCard = (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          backgroundColor: colors.surface,
          borderRadius: 20,
          borderColor: colors.border,
          padding: spacing.md,
        },
      ]}
    >
      <Text variant="bodyMedium" style={{ marginBottom: spacing.sm }}>
        {t('documents.detailTimeline')}
      </Text>
      {timelineEvents.map((event) => (
        <DetailTimelineRow key={event.key} event={event} />
      ))}
    </View>
  );

  const statusCard = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: 20,
          borderColor: colors.border,
          padding: spacing.md,
          gap: spacing.sm,
        },
      ]}
    >
      <View style={styles.statusHeader}>
        <Text variant="bodyMedium">{t('documents.detailUpdateStatus')}</Text>
        <Text variant="caption" color={colors.textTertiary}>
          {t('documents.detailTapToChange')}
        </Text>
      </View>
      <View style={styles.statusActions}>
        {doc.kind === 'quote' ? (
          <>
            <StatusChip
              label={t('documents.statusChipSent')}
              active={doc.status === 'sent' || doc.status === 'accepted' || doc.status === 'declined'}
              disabled={busy}
              onPress={() => runAction(() => documentsRepository.markSent(doc.id))}
            />
            <StatusChip
              label={t('documents.statusChipAccepted')}
              active={doc.status === 'accepted'}
              disabled={busy}
              onPress={() => runAction(() => documentsRepository.markAccepted(doc.id))}
            />
            <StatusChip
              label={t('documents.statusChipDeclined')}
              active={doc.status === 'declined'}
              disabled={busy}
              onPress={() => runAction(() => documentsRepository.markDeclined(doc.id))}
            />
          </>
        ) : null}
        {doc.kind === 'invoice' ? (
          <>
            <StatusChip
              label={t('documents.statusChipSent')}
              active={doc.status === 'sent' || doc.status === 'unpaid' || doc.status === 'paid'}
              disabled={busy || doc.status === 'paid'}
              onPress={() => runAction(() => documentsRepository.markSent(doc.id))}
            />
            <StatusChip
              label={t('documents.actionPartPaid')}
              active={false}
              disabled={busy || doc.status === 'paid'}
              onPress={() => setMarkPaidOpen(true)}
            />
          </>
        ) : null}
        {doc.kind === 'report' ? (
          <StatusChip
            label={t('documents.statusChipSent')}
            active={doc.status === 'sent'}
            disabled={busy}
            onPress={() => runAction(() => documentsRepository.markSent(doc.id))}
          />
        ) : null}
      </View>
      <Text variant="caption" color={colors.textSecondary}>
        {doc.kind === 'quote' ? t('documents.quoteStatusHint') : documentStatusHint(doc, eff, t)}
      </Text>
    </View>
  );

  if (breakpoint.isTablet) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <NavigationHeader
          title={kindLabel}
          onBack={() => goBack('/(tabs)/jobs')}
          right={
            <IconButton
              name="ellipsis-horizontal"
              accessibilityLabel={t('documents.moreOptionsA11y')}
              onPress={() => setMenuOpen(true)}
            />
          }
        />

        <View style={[styles.splitLayout, { backgroundColor: colors.background }]}>
          {/* Main content column */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: layout.panePadding,
              paddingTop: spacing.md,
              paddingBottom: stickyBottom ? 100 + insets.bottom : spacing.xl + insets.bottom,
            }}
          >
            {headerContent}
          </ScrollView>

          {/* Detail panel */}
          <ScrollView
            style={[
              styles.detailPanel,
              {
                width: layout.inspector,
                borderLeftWidth: StyleSheet.hairlineWidth,
                borderLeftColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            contentContainerStyle={{
              padding: layout.panePadding,
              paddingBottom: stickyBottom ? 100 + insets.bottom : spacing.xl + insets.bottom,
              gap: spacing.md,
            }}
          >
            {timelineCard}
            {statusCard}
          </ScrollView>
        </View>

        {/* Sticky bottom bar (same as phone) */}
        {renderStickyBar()}

        {renderSheets()}
      </Screen>
    );
  }

  // Phone layout
  return (
    <Screen edges={['top', 'left', 'right']}>
      <NavigationHeader
        title={kindLabel}
        onBack={() => goBack('/(tabs)/jobs')}
        right={
          <IconButton
            name="ellipsis-horizontal"
            accessibilityLabel={t('documents.moreOptionsA11y')}
            onPress={() => setMenuOpen(true)}
          />
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: stickyBottom ? 100 + insets.bottom : spacing.xl + insets.bottom,
          gap: spacing.md,
        }}
      >
        {headerContent}
        {timelineCard}
        {statusCard}
      </ScrollView>

      {renderStickyBar()}
      {renderSheets()}
    </Screen>
  );
}

function dueMetaForDoc(
  doc: TradeDocument,
  overdue: boolean,
  t: (key: string, options?: Record<string, string | number>) => string
): string | null {
  if (doc.kind !== 'invoice' || !doc.dueDate) return null;
  const dueLabel = formatDateShort(doc.dueDate);
  if (overdue) {
    const days = daysPastDue(doc.dueDate);
    return t('documents.detailDueOverdue', { date: dueLabel, count: days });
  }
  if (doc.status === 'paid') return null;
  return t('documents.detailDueOn', { date: dueLabel });
}

function daysPastDue(dueDate: string): number {
  const due = dueDate.slice(0, 10);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const parts = due.split('-');
  const y = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 1);
  const d = Number(parts[2] ?? 1);
  const startDue = new Date(y, m - 1, d);
  return Math.max(1, Math.round((startToday.getTime() - startDue.getTime()) / 86_400_000));
}

function buildTimelineEvents(
  doc: TradeDocument,
  t: (key: string, options?: Record<string, string | number>) => string
): TimelineEvent[] {
  if (doc.kind === 'invoice') {
    const paid = doc.status === 'paid';
    const sent = Boolean(doc.sentAt) || doc.status !== 'draft';
    const overdue = isOverdue(doc);
    let dueState: TimelineNodeState = 'todo';
    if (paid) dueState = 'done';
    else if (overdue) dueState = 'alert';

    return [
      {
        key: 'created',
        label: doc.sourceDocumentId ? t('documents.timelineCreatedFromQuote') : t('documents.timelineCreated'),
        state: 'done',
        isLast: false,
      },
      {
        key: 'sent',
        label: t('documents.timelineSentEmail'),
        state: sent ? 'done' : 'todo',
        isLast: false,
      },
      {
        key: 'due',
        label: t('documents.timelinePaymentDue'),
        state: dueState,
        isLast: false,
      },
      {
        key: 'paid',
        label: t('documents.timelinePaid'),
        state: paid ? 'done' : 'todo',
        isLast: true,
      },
    ];
  }

  if (doc.kind === 'quote') {
    const sent = Boolean(doc.sentAt) || doc.status !== 'draft';
    const decided = doc.status === 'accepted' || doc.status === 'declined';
    return [
      { key: 'created', label: t('documents.timelineCreated'), state: 'done', isLast: false },
      { key: 'sent', label: t('documents.timelineSentEmail'), state: sent ? 'done' : 'todo', isLast: false },
      {
        key: 'response',
        label:
          doc.status === 'accepted'
            ? t('documents.statusAccepted')
            : doc.status === 'declined'
              ? t('documents.statusDeclined')
              : t('documents.timelineAwaitingResponse'),
        state: decided ? (doc.status === 'declined' ? 'alert' : 'done') : 'todo',
        isLast: true,
      },
    ];
  }

  return [
    { key: 'created', label: t('documents.timelineCreated'), state: 'done', isLast: false },
    { key: 'sent', label: t('documents.timelineSentEmail'), state: doc.sentAt ? 'done' : 'todo', isLast: true },
  ];
}

function documentStatusHint(
  doc: TradeDocument,
  eff: ReturnType<typeof effectiveStatus>,
  t: (key: string) => string
): string {
  if (eff === 'overdue') return t('documents.statusOverdue');
  if (doc.kind === 'quote' && doc.status === 'accepted') return t('documents.statusAccepted');
  if (doc.kind === 'invoice' && doc.status === 'paid') return t('documents.statusPaid');
  if (doc.status === 'sent') return t('documents.statusSent');
  return t('documents.statusDraft');
}

function DetailTimelineRow({ event }: { event: TimelineEvent }) {
  const { colors, spacing } = useTheme();
  const { state, label, isLast } = event;

  return (
    <View style={styles.timelineRow}>
      <View style={styles.rail}>
        {state === 'done' ? (
          <View style={[styles.nodeDone, { backgroundColor: colors.accent }]}>
            <Ionicons name="checkmark" size={14} color={colors.accentOnAccent} />
          </View>
        ) : state === 'alert' ? (
          <View style={[styles.nodeDone, { backgroundColor: colors.destructive }]}>
            <Ionicons name="alert" size={14} color={colors.textInverse} />
          </View>
        ) : (
          <View style={[styles.nodeTodo, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]} />
        )}
        {!isLast ? (
          <View style={[styles.railLine, { backgroundColor: state === 'done' ? colors.accent : colors.border }]} />
        ) : null}
      </View>
      <Text variant="body" color={state === 'todo' ? colors.textSecondary : colors.textPrimary} style={{ paddingBottom: isLast ? 0 : spacing.sm, flex: 1 }}>
        {label}
      </Text>
    </View>
  );
}

function StatusChip({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: active ? colors.accent : colors.border,
          backgroundColor: active ? colors.accentSoft : colors.surface,
          borderRadius: radius.pill,
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
        },
      ]}
    >
      <Text variant="bodySmall" color={active ? colors.accentPressed : colors.textPrimary} style={styles.chipLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  detailPanel: {
    flexShrink: 0,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  headerMain: { flex: 1, minWidth: 0, paddingTop: 2 },
  docNumber: { fontWeight: '600', letterSpacing: 0.3 },
  amount: { marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 },
  card: { borderWidth: 1 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  statusActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipLabel: { fontWeight: '600' },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  rail: { width: 26, alignItems: 'center', marginRight: 10 },
  nodeDone: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeTodo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
  },
  railLine: { width: 2, flex: 1, minHeight: 18, marginTop: 4, borderRadius: 1 },
  stickyBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  stickyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sendEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  markPaidBtn: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  markPaidLabel: { fontWeight: '700' },
  roundBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
});
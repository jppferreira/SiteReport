import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, IconButton, LoadingState, NavigationHeader, Screen, Text, useToast } from '@/components';
import { businessProfileRepository, documentsRepository, jobsRepository } from '@/database';
import { DocPdfThumb, DocStatusBadge, MarkPaidSheet } from '@/features/documents';
import { BottomSheetMenu } from '@/features/jobs/BottomSheetMenu';
import { useI18n } from '@/i18n/useI18n';
import { effectiveStatus, formatPence, isOverdue, TradeDocument } from '@/models';
import { sharePaymentReminder } from '@/services/documentReminders';
import { openLocalFile, shareFile } from '@/services/shareService';
import { useTheme } from '@/theme';
import { formatDateShort } from '@/utils/format';
import { goBack } from '@/utils/goBack';

type TimelineNodeState = 'done' | 'alert' | 'todo';

type TimelineEvent = {
  key: string;
  label: string;
  state: TimelineNodeState;
  isLast: boolean;
};

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { spacing, colors, radius, shadows } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [doc, setDoc] = useState<TradeDocument | null>(null);
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await documentsRepository.getDocument(id);
      setDoc(result);
      if (result) {
        const job = await jobsRepository.getJob(result.jobId);
        setJobTitle(job?.title ?? null);
        setCustomerName(job?.customerName ?? null);
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
        <NavigationHeader title={t('documents.detailTitle')} onBack={() => goBack('/(tabs)/documents')} />
        <LoadingState />
      </Screen>
    );
  }

  if (!doc) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <NavigationHeader title={t('documents.detailTitle')} onBack={() => goBack('/(tabs)/documents')} />
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

  const handleShare = async () => {
    if (!doc.localPdfUri) {
      showToast({ message: t('documents.toastNoPdf'), tone: 'neutral' });
      return;
    }
    try {
      const shared = await shareFile(doc.localPdfUri, doc.fileName ?? 'document.pdf');
      if (!shared) showToast({ message: t('documents.toastShareError'), tone: 'destructive' });
    } catch {
      showToast({ message: t('documents.toastShareError'), tone: 'destructive' });
    }
  };

  const handleRemind = async () => {
    try {
      const profile = await businessProfileRepository.getBusinessProfile();
      const result = await sharePaymentReminder({
        document: doc,
        customerName,
        jobTitle,
        profile,
      });
      if (result === 'shared') {
        showToast({ message: t('reminders.toastShared'), tone: 'success' });
      } else if (result === 'unavailable') {
        showToast({ message: t('reminders.toastShareUnavailable'), tone: 'warning' });
      }
    } catch {
      showToast({ message: t('reminders.toastShareUnavailable'), tone: 'destructive' });
    }
  };

  const handlePreview = async () => {
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

  return (
    <Screen edges={['top', 'left', 'right']}>
      <NavigationHeader
        title={kindLabel}
        onBack={() => goBack('/(tabs)/documents')}
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
          paddingBottom: showInvoiceActions ? 100 + insets.bottom : spacing.xl + insets.bottom,
          gap: spacing.md,
        }}
      >
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
                  label={t('documents.actionSent')}
                  active={doc.status === 'sent' || doc.status === 'accepted' || doc.status === 'declined'}
                  disabled={busy}
                  onPress={() => runAction(() => documentsRepository.markSent(doc.id))}
                />
                <StatusChip
                  label={t('documents.actionAccepted')}
                  active={doc.status === 'accepted'}
                  disabled={busy}
                  onPress={() => runAction(() => documentsRepository.markAccepted(doc.id))}
                />
              </>
            ) : null}
            {doc.kind === 'invoice' ? (
              <>
                <StatusChip
                  label={t('documents.actionSent')}
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
                label={t('documents.actionSent')}
                active={doc.status === 'sent'}
                disabled={busy}
                onPress={() => runAction(() => documentsRepository.markSent(doc.id))}
              />
            ) : null}
          </View>
          <Text variant="caption" color={colors.textSecondary}>
            {documentStatusHint(doc, eff, t)}
          </Text>
        </View>
      </ScrollView>

      {showInvoiceActions ? (
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
                onPress={handleRemind}
                disabled={busy}
                variant="filled"
                style={styles.roundBtn}
              />
            ) : null}
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
      ) : null}

      <BottomSheetMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={[
          ...(doc.localPdfUri
            ? [
                {
                  icon: 'eye-outline' as const,
                  label: t('common.preview'),
                  onPress: handlePreview,
                },
              ]
            : []),
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

      <MarkPaidSheet
        visible={markPaidOpen}
        defaultAmountPence={doc.totalPence}
        loading={busy}
        onClose={() => setMarkPaidOpen(false)}
        onSubmit={handleMarkPaid}
      />
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
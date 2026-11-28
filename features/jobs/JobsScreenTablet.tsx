import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  FloatingActionButton,
  IconButton,
  LoadingPage,
  Screen,
  SearchInput,
  Skeleton,
  SplitView,
  SplitViewEmptyState,
  Text,
  useToast,
} from '@/components';
import { jobsRepository } from '@/database';
import type { JobDocumentSummary } from '@/database/repositories/documentsRepository';
import { DocumentsSummaryCard } from '@/features/documents';
import { getDocTileBg } from '@/features/documents/documentTokens';
import { FirstReportPromptCard } from '@/features/jobs/FirstReportPromptCard';
import { JobCard } from '@/features/jobs/JobCard';
import { JobDocSegments } from '@/features/jobs/JobDocSegments';
import { JobsFilterSheet } from '@/features/jobs/JobsFilterSheet';
import { resolveJobPreviewRoute } from '@/features/jobs/openJobPreview';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useJobs, type JobsDocKindFilter } from '@/hooks/useJobs';
import { useTabletBreakpoint } from '@/hooks/useTabletBreakpoint';
import { useI18n } from '@/i18n/useI18n';
import type { DocumentKind } from '@/models';
import { Job, documentRequiresPro } from '@/models';
import { deleteJobFiles } from '@/services/fileService';
import { motionTiming, reduceMotion, useTheme } from '@/theme';
import { getLayoutTokens } from '@/theme/layoutTokens';

const SUMMARY_COLLAPSE_AT = 40;
const SUMMARY_EXPAND_AT = 8;
const SUMMARY_SCROLL_MOTION_MS = 280;
const SUMMARY_SCROLL_EASING = Easing.out(Easing.cubic);

const NO_MATCHING_JOBS = require('../../assets/images/no-matching-jobs.webp');
const NOTHING_HERE_YET = require('../../assets/images/nothing-here-yet.webp');

type Selection = 
  | { type: 'none' }
  | { type: 'job'; jobId: string }
  | { type: 'document'; documentId: string; jobId: string };

/**
 * iPad-specific Jobs screen with split view: list of jobs on the left,
 * selected job or document detail on the right.
 */
export function JobsScreenTablet() {
  const { colors, spacing, scheme } = useTheme();
  const { t } = useI18n();
  const { isPro } = useEntitlement();
  const breakpoint = useTabletBreakpoint();
  const layout = getLayoutTokens(breakpoint);

  const {
    jobs,
    photoSummaries,
    documentSummaries,
    kindPresence,
    docKind,
    setDocKind,
    sheetFilters,
    setSheetFilters,
    sheetActive,
    search,
    setSearch,
    loading,
    error,
    refresh,
    outstandingInvoicePence,
    waitingQuotePence,
    draftQuoteCount,
    draftQuotePence,
    awaitingQuoteCount,
    awaitingQuotePence,
    acceptedQuoteCount,
    acceptedQuotePence,
    declinedQuoteCount,
    declinedQuotePence,
    draftInvoiceCount,
    draftInvoicePence,
    sentInvoiceCount,
    sentInvoicePence,
    awaitingPaymentCount,
    awaitingPaymentPence,
  } = useJobs();

  const { showToast } = useToast();
  const [selection, setSelection] = useState<Selection>({ type: 'none' });
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const summaryScrollReveal = useSharedValue(1);
  const summaryScrollCollapsed = useSharedValue(false);

  const onJobsScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      const duration = reduceMotion.value ? 0 : SUMMARY_SCROLL_MOTION_MS;
      const timing = { duration, easing: SUMMARY_SCROLL_EASING };
      if (y >= SUMMARY_COLLAPSE_AT && !summaryScrollCollapsed.value) {
        summaryScrollCollapsed.value = true;
        summaryScrollReveal.value = withTiming(0, timing);
      } else if (y <= SUMMARY_EXPAND_AT && summaryScrollCollapsed.value) {
        summaryScrollCollapsed.value = false;
        summaryScrollReveal.value = withTiming(1, timing);
      }
    },
  });

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleDelete = async () => {
    if (!jobToDelete) return;
    setDeleting(true);
    try {
      await jobsRepository.deleteJob(jobToDelete.id);
      await deleteJobFiles(jobToDelete.id);
      showToast({ message: t('jobs.toastDeleted'), tone: 'neutral' });
      setJobToDelete(null);
      // Clear selection if deleted job was selected
      if (selection.type === 'job' && selection.jobId === jobToDelete.id) {
        setSelection({ type: 'none' });
      }
      refresh();
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (job: Job) => {
    const copy = await jobsRepository.duplicateJob(job.id);
    showToast({ message: t('jobs.toastDuplicated'), tone: 'success' });
    refresh();
    if (copy) setSelection({ type: 'job', jobId: copy.id });
  };

  const statusKind: DocumentKind | null = docKind === 'all' ? null : docKind;
  const isFiltered = docKind !== 'all' || sheetActive || search.length > 0;

  const handleAddKind = (kind: DocumentKind) => {
    if (documentRequiresPro(kind) && !isPro) {
      router.push({ pathname: '/paywall', params: { trigger: 'quote_invoice' } });
      return;
    }
    if (kind === 'report') {
      router.push({ pathname: '/job/new', params: { intent: 'report' } });
      return;
    }
    router.push({ pathname: '/document/new', params: { kind } });
  };

  const handleJobPress = (job: Job) => {
    const route = resolveJobPreviewRoute(job.id, documentSummaries[job.id], statusKind);
    if (route.type === 'document') {
      setSelection({ type: 'document', documentId: route.documentId, jobId: job.id });
    } else {
      setSelection({ type: 'job', jobId: job.id });
    }
  };

  if (loading && jobs.length === 0 && !error && !searchOpen) {
    return <LoadingPage label={t('jobs.loading')} />;
  }

  const showMoneySummary =
    (docKind === 'invoice' && kindPresence.invoice) || (docKind === 'quote' && kindPresence.quote);

  const listPaneContent = (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ flexGrow: 1 }}
        onScroll={onJobsScroll}
        scrollEventThrottle={16}
      >
        <View
          style={[
            styles.toolbar,
            {
              backgroundColor: colors.background,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.sm,
              paddingBottom: spacing.sm,
              gap: spacing.md,
            },
          ]}
        >
          <View style={styles.headerBlock}>
            <View style={styles.headerRow}>
              {searchOpen ? (
                <View style={styles.searchModeRow}>
                  <SearchInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder={t('jobs.searchPlaceholder')}
                    variant="compact"
                    autoFocus
                  />
                  <IconButton
                    name="close"
                    accessibilityLabel={t('common.close')}
                    onPress={() => {
                      setSearchOpen(false);
                      setSearch('');
                    }}
                  />
                </View>
              ) : (
                <View style={styles.headerActionsRow}>
                  <View style={{ flex: 1 }} />
                  <View>
                    <IconButton
                      name="options-outline"
                      accessibilityLabel={
                        sheetActive ? t('jobs.filtersActiveA11y') : t('jobs.filtersOpenA11y')
                      }
                      onPress={() => setFilterOpen(true)}
                    />
                    {sheetActive ? (
                      <View style={[styles.filterBadge, { backgroundColor: colors.accent }]} />
                    ) : null}
                  </View>
                  <IconButton
                    name="notifications-outline"
                    accessibilityLabel={t('notifications.openA11y')}
                    onPress={() => router.push('/notifications')}
                  />
                  <IconButton
                    name="search"
                    accessibilityLabel={t('jobs.searchPlaceholder')}
                    onPress={() => setSearchOpen(true)}
                  />
                </View>
              )}
            </View>

            <JobDocSegments value={docKind} onChange={setDocKind} />
          </View>

          <JobsMoneySummary
            visible={showMoneySummary}
            docKind={docKind}
            scrollReveal={summaryScrollReveal}
            outstandingInvoicePence={outstandingInvoicePence}
            waitingQuotePence={waitingQuotePence}
            draftQuoteCount={draftQuoteCount}
            draftQuotePence={draftQuotePence}
            awaitingQuoteCount={awaitingQuoteCount}
            awaitingQuotePence={awaitingQuotePence}
            acceptedQuoteCount={acceptedQuoteCount}
            acceptedQuotePence={acceptedQuotePence}
            declinedQuoteCount={declinedQuoteCount}
            declinedQuotePence={declinedQuotePence}
            draftInvoiceCount={draftInvoiceCount}
            draftInvoicePence={draftInvoicePence}
            sentInvoiceCount={sentInvoiceCount}
            sentInvoicePence={sentInvoicePence}
            awaitingPaymentCount={awaitingPaymentCount}
            awaitingPaymentPence={awaitingPaymentPence}
          />
        </View>

        {error ? (
          <View style={{ flexGrow: 1, paddingHorizontal: spacing.lg }}>
            <ErrorState title={t('jobs.errorLoadTitle')} description={error} onAction={refresh} />
          </View>
        ) : loading && !searchOpen ? (
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
            <Skeleton height={100} radius={20} style={{ marginBottom: 12 }} />
            <Skeleton height={100} radius={20} style={{ marginBottom: 12 }} />
            <Skeleton height={100} radius={20} />
          </View>
        ) : jobs.length === 0 ? (
          isFiltered ? (
            <View style={{ flexGrow: 1 }}>
              {search.length > 0 ? (
                <EmptyState
                  illustration={NO_MATCHING_JOBS}
                  title={t('jobs.emptyNoMatchTitle')}
                  description={t('jobs.emptyNoMatchDescription')}
                />
              ) : (
                <EmptyState
                  illustration={NOTHING_HERE_YET}
                  title={t('jobs.emptyFilteredTitle')}
                  description={t('jobs.emptyFilteredDescription')}
                />
              )}
            </View>
          ) : (
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg }}>
              <FirstReportPromptCard onPress={() => router.push('/job/new')} />
            </View>
          )
        ) : (
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg }}>
            {jobs.map((item) => (
              <SwipeableJobCard
                key={item.id}
                job={item}
                thumbnailUri={photoSummaries[item.id]?.thumbnailUri ?? null}
                documentSummary={documentSummaries[item.id] ?? null}
                statusKind={statusKind}
                selected={
                  selection.type === 'job'
                    ? selection.jobId === item.id
                    : selection.type === 'document'
                    ? selection.jobId === item.id
                    : false
                }
                onPress={() => handleJobPress(item)}
                onDuplicate={() => handleDuplicate(item)}
                onDelete={() => setJobToDelete(item)}
              />
            ))}
          </View>
        )}
      </Animated.ScrollView>

      <FloatingActionButton
        accessibilityLabel={t('jobs.addMenuA11y')}
        actions={[
          {
            key: 'quote',
            label: t('jobs.addQuote'),
            icon: 'clipboard',
            backgroundColor: getDocTileBg('quote', scheme),
            iconColor: '#1A4B8C',
            onPress: () => handleAddKind('quote'),
          },
          {
            key: 'report',
            label: t('jobs.addReport'),
            icon: 'document-text',
            backgroundColor: getDocTileBg('report', scheme),
            iconColor: '#178A3C',
            onPress: () => handleAddKind('report'),
          },
          {
            key: 'invoice',
            label: t('jobs.addInvoice'),
            icon: 'receipt',
            backgroundColor: getDocTileBg('invoice', scheme),
            iconColor: '#6B3FA0',
            onPress: () => handleAddKind('invoice'),
          },
        ]}
      />
    </View>
  );

  const detailPaneContent = (() => {
    if (selection.type === 'none') {
      return (
        <SplitViewEmptyState
          icon="document-text-outline"
          message={t('jobs.ipadEmptyDetailMessage')}
          hint={t('jobs.ipadEmptyDetailHint')}
        />
      );
    }

    if (selection.type === 'job') {
      return (
        <JobDetailPane
          jobId={selection.jobId}
          onClose={() => setSelection({ type: 'none' })}
        />
      );
    }

    if (selection.type === 'document') {
      return (
        <DocumentDetailPane
          documentId={selection.documentId}
          jobId={selection.jobId}
          onClose={() => setSelection({ type: 'none' })}
        />
      );
    }

    return null;
  })();

  return (
    <Screen edges={['top', 'left', 'right']}>
      <SplitView list={listPaneContent} detail={detailPaneContent} />

      <JobsFilterSheet
        visible={filterOpen}
        value={sheetFilters}
        onClose={() => setFilterOpen(false)}
        onApply={setSheetFilters}
      />

      <ConfirmationDialog
        visible={jobToDelete !== null}
        title={t('jobs.deleteConfirmTitle')}
        description={t('jobs.deleteConfirmDescription')}
        confirmLabel={t('jobs.deleteConfirmLabel')}
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setJobToDelete(null)}
        loading={deleting}
      />
    </Screen>
  );
}

// Detail pane components
function JobDetailPane({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  return <JobDetailPaneContent jobId={jobId} onClose={onClose} />;
}

function DocumentDetailPane({ documentId, jobId, onClose }: { documentId: string; jobId: string; onClose: () => void }) {
  return <DocumentDetailPaneContent documentId={documentId} onClose={onClose} />;
}

type JobsMoneySummaryProps = {
  visible: boolean;
  docKind: JobsDocKindFilter;
  scrollReveal: SharedValue<number>;
  outstandingInvoicePence: number;
  waitingQuotePence: number;
  draftQuoteCount: number;
  draftQuotePence: number;
  awaitingQuoteCount: number;
  awaitingQuotePence: number;
  acceptedQuoteCount: number;
  acceptedQuotePence: number;
  declinedQuoteCount: number;
  declinedQuotePence: number;
  draftInvoiceCount: number;
  draftInvoicePence: number;
  sentInvoiceCount: number;
  sentInvoicePence: number;
  awaitingPaymentCount: number;
  awaitingPaymentPence: number;
};

function JobsMoneySummary({
  visible,
  docKind,
  scrollReveal,
  outstandingInvoicePence,
  waitingQuotePence,
  draftQuoteCount,
  draftQuotePence,
  awaitingQuoteCount,
  awaitingQuotePence,
  acceptedQuoteCount,
  acceptedQuotePence,
  declinedQuoteCount,
  declinedQuotePence,
  draftInvoiceCount,
  draftInvoicePence,
  sentInvoiceCount,
  sentInvoicePence,
  awaitingPaymentCount,
  awaitingPaymentPence,
}: JobsMoneySummaryProps) {
  const { spacing } = useTheme();
  const segment = docKind === 'quote' || docKind === 'invoice' ? docKind : 'invoice';
  const open = useSharedValue(0);
  const measuredHeight = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    open.value = motionTiming(visible ? 1 : 0, { duration: 220 });
  }, [open, visible]);

  useEffect(() => {
    if (!visible) return;
    contentOpacity.value = 0;
    contentOpacity.value = motionTiming(1, { duration: 180 });
  }, [contentOpacity, docKind, visible]);

  const shellStyle = useAnimatedStyle(() => {
    const progress = open.value * scrollReveal.value;
    const fullyOpen = progress >= 0.995;
    const measured = measuredHeight.value;
    return {
      height: measured > 0 ? measured * progress : undefined,
      opacity: progress,
      overflow: fullyOpen ? ('visible' as const) : ('hidden' as const),
    };
  });

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const body = (
    <View style={{ paddingTop: spacing.lg, paddingBottom: 24, paddingHorizontal: 6 }}>
      <DocumentsSummaryCard
        segment={segment}
        outstandingPence={outstandingInvoicePence}
        waitingPence={waitingQuotePence}
        draftQuoteCount={draftQuoteCount}
        draftQuotePence={draftQuotePence}
        awaitingQuoteCount={awaitingQuoteCount}
        awaitingQuotePence={awaitingQuotePence}
        acceptedQuoteCount={acceptedQuoteCount}
        acceptedQuotePence={acceptedQuotePence}
        declinedQuoteCount={declinedQuoteCount}
        declinedQuotePence={declinedQuotePence}
        draftInvoiceCount={draftInvoiceCount}
        draftInvoicePence={draftInvoicePence}
        sentInvoiceCount={sentInvoiceCount}
        sentInvoicePence={sentInvoicePence}
        awaitingPaymentCount={awaitingPaymentCount}
        awaitingPaymentPence={awaitingPaymentPence}
      />
    </View>
  );

  return (
    <View>
      <View
        pointerEvents="none"
        style={styles.summaryMeasure}
        onLayout={(event) => {
          const next = event.nativeEvent.layout.height;
          if (next > 0) measuredHeight.value = next;
        }}
      >
        {body}
      </View>
      <Animated.View style={shellStyle} pointerEvents={visible ? 'auto' : 'none'}>
        <Animated.View style={contentStyle}>{body}</Animated.View>
      </Animated.View>
    </View>
  );
}

function SwipeableJobCard({
  job,
  thumbnailUri,
  documentSummary,
  statusKind,
  selected,
  onPress,
  onDuplicate,
  onDelete,
}: {
  job: Job;
  thumbnailUri: string | null;
  documentSummary: JobDocumentSummary | null;
  statusKind: DocumentKind | null;
  selected: boolean;
  onPress: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { spacing, colors } = useTheme();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const height = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({ height: height.value, opacity: height.value > 0 ? 1 : 0 }));

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    height.value = motionTiming(next ? 44 : 0, { duration: 160 });
  };

  return (
    <View style={{ marginBottom: 8 }}>
      <Pressable onLongPress={toggle} delayLongPress={300}>
        <View style={selected ? { borderWidth: 2, borderColor: colors.accent, borderRadius: 20 } : undefined}>
          <JobCard
            job={job}
            thumbnailUri={thumbnailUri}
            documentSummary={documentSummary}
            statusKind={statusKind}
            onPress={onPress}
          />
        </View>
      </Pressable>
      <Animated.View style={[styles.actionsRow, { gap: spacing.xs }, animatedStyle]}>
        <ActionChip icon="copy-outline" label={t('common.duplicate')} onPress={onDuplicate} />
        <ActionChip icon="trash-outline" label={t('common.delete')} onPress={onDelete} destructive />
      </Animated.View>
    </View>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.actionChip,
        { backgroundColor: colors.surfaceSunken, borderRadius: radius.md },
      ]}
    >
      <Ionicons name={icon} size={14} color={destructive ? colors.destructive : colors.textSecondary} />
      <Text variant="caption" color={destructive ? colors.destructive : colors.textSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: 24,
  },
  headerRow: {
    minHeight: 44,
    justifyContent: 'center',
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  toolbar: {
    zIndex: 1,
  },
  summaryMeasure: {
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0,
    zIndex: -1,
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    overflow: 'hidden',
    marginTop: -4,
    marginBottom: 8,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
  },
});

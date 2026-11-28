import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
  CrewAvatar,
  EmptyState,
  ErrorState,
  FloatingActionButton,
  IconButton,
  LoadingPage,
  Screen,
  SearchInput,
  Skeleton,
  Text,
  useToast,
} from '@/components';
import { PILL_TAB_BAR_WASH_ABOVE } from '@/components/PillTabBar';
import { jobsRepository } from '@/database';
import type { JobDocumentSummary } from '@/database/repositories/documentsRepository';
import { DocumentsSummaryCard } from '@/features/documents';
import { DOC_KIND_TILE_BG } from '@/features/documents/documentTokens';
import { FirstReportPromptCard } from '@/features/jobs/FirstReportPromptCard';
import { JobCard } from '@/features/jobs/JobCard';
import { JobDocSegments } from '@/features/jobs/JobDocSegments';
import { JobsFilterSheet } from '@/features/jobs/JobsFilterSheet';
import { JobsScreenTablet } from '@/features/jobs/JobsScreenTablet';
import { resolveJobPreviewRoute } from '@/features/jobs/openJobPreview';
import { useCrewAvatar } from '@/hooks/useCrewAvatar';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useJobs, type JobsDocKindFilter } from '@/hooks/useJobs';
import { useTabletBreakpoint } from '@/hooks/useTabletBreakpoint';
import { useI18n } from '@/i18n/useI18n';
import type { DocumentKind } from '@/models';
import { Job, documentRequiresPro } from '@/models';
import { deleteJobFiles } from '@/services/fileService';
import { motionTiming, reduceMotion, useTheme } from '@/theme';

/** Collapse the money summary once the list has scrolled past this offset. */
const SUMMARY_COLLAPSE_AT = 40;
/** Expand again only when the list is essentially back at the top. */
const SUMMARY_EXPAND_AT = 8;
/** Soft vertical shrink / grow while the sticky header height frees space. */
const SUMMARY_SCROLL_MOTION_MS = 280;
const SUMMARY_SCROLL_EASING = Easing.out(Easing.cubic);

const NO_MATCHING_JOBS = require('../../assets/images/no-matching-jobs.webp');
const NOTHING_HERE_YET = require('../../assets/images/nothing-here-yet.webp');

export default function JobsScreen() {
  const { isTablet } = useTabletBreakpoint();

  // On tablet, use the split view layout
  if (isTablet) {
    return <JobsScreenTablet />;
  }

  // Phone layout continues below
  return <JobsScreenPhone />;
}

function JobsScreenPhone() {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { isPro } = useEntitlement();
  const tabBarHeight = useBottomTabBarHeight();
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
      refresh();
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (job: Job) => {
    const copy = await jobsRepository.duplicateJob(job.id);
    showToast({ message: t('jobs.toastDuplicated'), tone: 'success' });
    refresh();
    if (copy) router.push(`/job/${copy.id}`);
  };

  const statusKind: DocumentKind | null = docKind === 'all' ? null : docKind;
  const isFiltered = docKind !== 'all' || sheetActive || search.length > 0;

  const handleAddKind = (kind: DocumentKind) => {
    if (documentRequiresPro(kind) && !isPro) {
      router.push({ pathname: '/paywall', params: { trigger: 'quote_invoice' } });
      return;
    }
    // New reports use the guided checklist (photos, notes, signature, …).
    if (kind === 'report') {
      router.push({ pathname: '/job/new', params: { intent: 'report' } });
      return;
    }
    router.push({ pathname: '/document/new', params: { kind } });
  };

  const openJobCard = (job: Job) => {
    const route = resolveJobPreviewRoute(job.id, documentSummaries[job.id], statusKind);
    if (route.type === 'reportPreview') {
      router.push(`/job/${route.jobId}/preview`);
      return;
    }
    if (route.type === 'document') {
      router.push(`/document/${route.documentId}`);
      return;
    }
    // No document yet — continue (or start) the guided checklist.
    router.push(`/job/${route.jobId}`);
  };

  // Never swap the whole screen for LoadingPage while search is open — that
  // unmounts SearchInput and makes the keyboard flicker on/off.
  if (loading && jobs.length === 0 && !error && !searchOpen) {
    return <LoadingPage label={t('jobs.loading')} />;
  }

  const showMoneySummary =
    (docKind === 'invoice' && kindPresence.invoice) || (docKind === 'quote' && kindPresence.quote);

  return (
    <Screen edges={['top', 'left', 'right']}>
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
                // Plain View — Reanimated FadeIn can stick at opacity 0 on Android
                // after reload / sticky-header remounts, which hid the whole toolbar.
                <View style={styles.headerActionsRow}>
                  <AccountAvatarButton />
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
          <View style={{ flexGrow: 1, paddingBottom: tabBarHeight }}>
            <ErrorState title={t('jobs.errorLoadTitle')} description={error} onAction={refresh} />
          </View>
        ) : loading && !searchOpen ? (
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: tabBarHeight }}>
            <Skeleton height={100} radius={20} style={{ marginBottom: 12 }} />
            <Skeleton height={100} radius={20} style={{ marginBottom: 12 }} />
            <Skeleton height={100} radius={20} />
          </View>
        ) : jobs.length === 0 ? (
          isFiltered ? (
            <View style={{ flexGrow: 1, paddingBottom: tabBarHeight }}>
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
            <View
              style={{
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.md,
                paddingBottom: spacing.lg + tabBarHeight + PILL_TAB_BAR_WASH_ABOVE,
              }}
            >
              <FirstReportPromptCard onPress={() => router.push('/job/new')} />
            </View>
          )
        ) : (
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: spacing.lg + tabBarHeight + PILL_TAB_BAR_WASH_ABOVE,
            }}
          >
            {jobs.map((item) => (
              <SwipeableJobCard
                key={item.id}
                job={item}
                thumbnailUri={photoSummaries[item.id]?.thumbnailUri ?? null}
                documentSummary={documentSummaries[item.id] ?? null}
                statusKind={statusKind}
                onPress={() => openJobCard(item)}
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
            backgroundColor: DOC_KIND_TILE_BG.quote,
            iconColor: '#1A4B8C',
            onPress: () => handleAddKind('quote'),
          },
          {
            key: 'report',
            label: t('jobs.addReport'),
            icon: 'document-text',
            backgroundColor: DOC_KIND_TILE_BG.report,
            iconColor: '#178A3C',
            onPress: () => handleAddKind('report'),
          },
          {
            key: 'invoice',
            label: t('jobs.addInvoice'),
            icon: 'receipt',
            backgroundColor: DOC_KIND_TILE_BG.invoice,
            iconColor: '#6B3FA0',
            onPress: () => handleAddKind('invoice'),
          },
        ]}
      />

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

function AccountAvatarButton() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [composition] = useCrewAvatar();

  return (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel={t('settings.openA11y')}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <CrewAvatar composition={composition} size={44} borderColor={colors.border} />
    </Pressable>
  );
}

type JobsMoneySummaryProps = {
  visible: boolean;
  docKind: JobsDocKindFilter;
  /** 1 at top of list, animates to 0 when the user scrolls away. */
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

  // Height-only collapse: clip from the bottom so the card shrinks vertically
  // without squashing width (uniform scale looked like a zoom, not a shrink).
  // When fully open, overflow:visible so Android boxShadow is not clipped.
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

  // Top padding is measured with the card so the gap above “Waiting for a reply”
  // survives the height animation (parent flex gap alone was collapsing).
  // Extra pad keeps soft shadow bleed inside the measured shell while collapsing.
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
  onPress,
  onDuplicate,
  onDelete,
}: {
  job: Job;
  thumbnailUri: string | null;
  documentSummary: JobDocumentSummary | null;
  statusKind: DocumentKind | null;
  onPress: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { spacing } = useTheme();
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
    <View>
      <Pressable onLongPress={toggle} delayLongPress={300}>
        <JobCard
          job={job}
          thumbnailUri={thumbnailUri}
          documentSummary={documentSummary}
          statusKind={statusKind}
          onPress={onPress}
        />
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

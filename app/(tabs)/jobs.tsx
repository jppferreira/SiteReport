import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
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
  Text,
  useToast,
} from '@/components';
import { PILL_TAB_BAR_WASH_ABOVE } from '@/components/PillTabBar';
import { jobsRepository } from '@/database';
import type { JobDocumentSummary } from '@/database/repositories/documentsRepository';
import { FirstReportPromptCard } from '@/features/jobs/FirstReportPromptCard';
import { JobCard } from '@/features/jobs/JobCard';
import { JobDocSegments } from '@/features/jobs/JobDocSegments';
import { JobsFilterSheet } from '@/features/jobs/JobsFilterSheet';
import { Wordmark } from '@/features/onboarding/Wordmark';
import { useJobs } from '@/hooks/useJobs';
import { useI18n } from '@/i18n/useI18n';
import type { DocumentKind } from '@/models';
import { Job } from '@/models';
import { deleteJobFiles } from '@/services/fileService';
import { motionTiming, reduceMotion, useTheme } from '@/theme';

const NO_MATCHING_JOBS = require('../../assets/images/no-matching-jobs.png');
const NOTHING_HERE_YET = require('../../assets/images/nothing-here-yet.png');

export default function JobsScreen() {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
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
  } = useJobs();
  const { showToast } = useToast();
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const scrollY = useSharedValue(0);
  const wordmarkHeight = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const onWordmarkLayout = (event: LayoutChangeEvent) => {
    wordmarkHeight.value = event.nativeEvent.layout.height;
  };

  const wordmarkStyle = useAnimatedStyle(() => {
    const distance = wordmarkHeight.value;
    if (distance <= 0 || reduceMotion.value) {
      return { opacity: 1, transform: [{ scale: 1 }] };
    }
    const progress = interpolate(scrollY.value, [0, distance], [0, 1], Extrapolation.CLAMP);
    const eased = progress * progress * (3 - 2 * progress);
    return {
      opacity: 1 - eased,
      transform: [{ scale: 1 - eased * 0.18 }],
    };
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

  if (loading && jobs.length === 0 && !error) {
    return <LoadingPage label={t('jobs.loading')} />;
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Animated.View
          onLayout={onWordmarkLayout}
          style={[
            styles.headerRow,
            { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
            wordmarkStyle,
          ]}
        >
          <View style={styles.wordmark}>
            <Wordmark />
          </View>
          <View style={styles.headerActions}>
            <IconButton
              name="notifications-outline"
              accessibilityLabel={t('notifications.openA11y')}
              onPress={() => router.push('/notifications')}
            />
            <IconButton
              name="settings-outline"
              accessibilityLabel={t('settings.openA11y')}
              onPress={() => router.push('/(tabs)/settings')}
            />
          </View>
        </Animated.View>

        <View
          style={[
            styles.toolbar,
            {
              backgroundColor: colors.background,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.xs,
              paddingBottom: spacing.sm,
              gap: spacing.sm,
            },
          ]}
        >
          <JobDocSegments value={docKind} onChange={setDocKind} presence={kindPresence} />

          <View style={styles.toolRow}>
            {searchOpen || search.length > 0 ? (
              <SearchInput
                value={search}
                onChangeText={setSearch}
                placeholder={t('jobs.searchPlaceholder')}
                variant="compact"
              />
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <IconButton
              name="search"
              accessibilityLabel={t('jobs.searchPlaceholder')}
              onPress={() => {
                if (searchOpen && search.length === 0) {
                  setSearchOpen(false);
                } else {
                  setSearchOpen(true);
                }
              }}
            />
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
          </View>
        </View>

        {error ? (
          <View style={{ flexGrow: 1, paddingBottom: tabBarHeight }}>
            <ErrorState title={t('jobs.errorLoadTitle')} description={error} onAction={refresh} />
          </View>
        ) : loading ? (
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
                onPress={() => router.push(`/job/${item.id}`)}
                onDuplicate={() => handleDuplicate(item)}
                onDelete={() => setJobToDelete(item)}
              />
            ))}
          </View>
        )}
      </Animated.ScrollView>

      <FloatingActionButton
        label={t('jobs.newJob')}
        accessibilityLabel={t('jobs.newJobA11y')}
        onPress={() => router.push('/job/new')}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    transformOrigin: 'left center',
  },
  wordmark: {
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolbar: {
    zIndex: 1,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { ConfirmationDialog, EmptyState, ErrorState, LoadingPage, Screen, SearchInput, Skeleton, Text, TextButton, useToast } from '@/components';
import { jobsRepository } from '@/database';
import { FilterChips } from '@/features/jobs/FilterChips';
import { JobCard } from '@/features/jobs/JobCard';
import { Wordmark } from '@/features/onboarding/Wordmark';
import { useJobs } from '@/hooks/useJobs';
import { useI18n } from '@/i18n/useI18n';
import { Job } from '@/models';
import { deleteJobFiles } from '@/services/fileService';
import { resetOnboarding } from '@/services/preferencesService';
import { motionTiming, reduceMotion, useTheme } from '@/theme';

const NO_JOBS_YET = require('../../assets/images/no-jobs-yet.png');
const NO_MATCHING_JOBS = require('../../assets/images/no-matching-jobs.png');
const NOTHING_HERE_YET = require('../../assets/images/nothing-here-yet.png');

export default function JobsScreen() {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const tabBarHeight = useBottomTabBarHeight();
  const { jobs, photoSummaries, filter, setFilter, search, setSearch, loading, error, refresh } = useJobs();
  const { showToast } = useToast();
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);
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
    // Smoothstep keeps the mark visible while it is still on screen, then eases it out.
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

  // Figma "00d · Loading" — full-screen branded wait when jobs aren't ready yet.
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
            styles.wordmark,
            { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
            wordmarkStyle,
          ]}
        >
          <Wordmark />
        </Animated.View>

        <View
          style={[
            styles.toolbar,
            {
              backgroundColor: colors.background,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.xs,
              paddingBottom: spacing.sm,
            },
          ]}
        >
          <View style={styles.searchRow}>
            <View style={styles.searchSlot}>
              <SearchInput value={search} onChangeText={setSearch} placeholder={t('jobs.searchPlaceholder')} />
            </View>
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                router.push('/job/new');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('jobs.newJobA11y')}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: pressed ? colors.ctaDarkPressed : colors.ctaDark,
                  borderRadius: radius.xl,
                },
              ]}
            >
              <Ionicons name="add" size={28} color={colors.textInverse} />
            </Pressable>
          </View>

          <View style={{ marginTop: spacing.sm }}>
            <FilterChips value={filter} onChange={setFilter} />
          </View>

          {__DEV__ ? (
            <TextButton
              label="Test onboarding"
              align="left"
              tone="accent"
              onPress={async () => {
                await resetOnboarding();
                router.push('/onboarding');
              }}
            />
          ) : null}
        </View>

        {error ? (
          <View style={{ flexGrow: 1, paddingBottom: tabBarHeight }}>
            <ErrorState title={t('jobs.errorLoadTitle')} description={error} onAction={refresh} />
          </View>
        ) : loading ? (
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: tabBarHeight }}>
            <Skeleton height={76} radius={16} style={{ marginBottom: 12 }} />
            <Skeleton height={76} radius={16} style={{ marginBottom: 12 }} />
            <Skeleton height={76} radius={16} />
          </View>
        ) : jobs.length === 0 ? (
          <View style={{ flexGrow: 1, paddingBottom: tabBarHeight }}>
            {search.length > 0 ? (
              <EmptyState
                illustration={NO_MATCHING_JOBS}
                title={t('jobs.emptyNoMatchTitle')}
                description={t('jobs.emptyNoMatchDescription')}
              />
            ) : filter !== 'all' ? (
              <EmptyState
                illustration={NOTHING_HERE_YET}
                title={t('jobs.emptyFilteredTitle')}
                description={t('jobs.emptyFilteredDescription')}
              />
            ) : (
              <EmptyState
                illustration={NO_JOBS_YET}
                title={t('jobs.emptyTitle')}
                description={t('jobs.emptyDescription')}
                actionLabel={t('jobs.createJob')}
                onAction={() => router.push('/job/new')}
              />
            )}
          </View>
        ) : (
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: spacing.lg + tabBarHeight,
            }}
          >
            {jobs.map((item) => (
              <SwipeableJobCard
                key={item.id}
                job={item}
                photoCount={photoSummaries[item.id]?.count ?? 0}
                thumbnailUri={photoSummaries[item.id]?.thumbnailUri ?? null}
                onPress={() => router.push(`/job/${item.id}`)}
                onDuplicate={() => handleDuplicate(item)}
                onDelete={() => setJobToDelete(item)}
              />
            ))}
          </View>
        )}
      </Animated.ScrollView>

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
  photoCount,
  thumbnailUri,
  onPress,
  onDuplicate,
  onDelete,
}: {
  job: Job;
  photoCount: number;
  thumbnailUri: string | null;
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
        <JobCard job={job} photoCount={photoCount} thumbnailUri={thumbnailUri} onPress={onPress} />
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
  wordmark: {
    alignSelf: 'flex-start',
    transformOrigin: 'left center',
  },
  toolbar: {
    zIndex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchSlot: {
    flex: 1,
    minWidth: 0,
  },
  addButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
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

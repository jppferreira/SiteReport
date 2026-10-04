import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ConfirmationDialog, EmptyState, ErrorState, IconButton, SearchInput, Skeleton, Text, useToast } from '@/components';
import { jobsRepository } from '@/database';
import { FilterChips } from '@/features/jobs/FilterChips';
import { JobCard } from '@/features/jobs/JobCard';
import { useJobs } from '@/hooks/useJobs';
import { Job } from '@/models';
import { deleteJobFiles } from '@/services/fileService';
import { useTheme } from '@/theme';

export default function JobsScreen() {
  const { colors, spacing } = useTheme();
  const { jobs, photoSummaries, filter, setFilter, search, setSearch, loading, error, refresh } = useJobs();
  const { showToast } = useToast();
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      showToast({ message: 'Job deleted', tone: 'neutral' });
      setJobToDelete(null);
      refresh();
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (job: Job) => {
    const copy = await jobsRepository.duplicateJob(job.id);
    showToast({ message: 'Job duplicated', tone: 'success' });
    refresh();
    if (copy) router.push(`/job/${copy.id}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <View style={styles.headerRow}>
          <Text variant="display">Jobs</Text>
          <IconButton name="add" accessibilityLabel="New job" variant="filled" onPress={() => router.push('/job/new')} />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <SearchInput value={search} onChangeText={setSearch} />
        </View>

        <View style={{ marginTop: spacing.sm }}>
          <FilterChips value={filter} onChange={setFilter} />
        </View>
      </View>

      {error ? (
        <ErrorState title="We couldn't load your jobs" description={error} onAction={refresh} />
      ) : loading ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Skeleton height={76} radius={16} style={{ marginBottom: 12 }} />
          <Skeleton height={76} radius={16} style={{ marginBottom: 12 }} />
          <Skeleton height={76} radius={16} />
        </View>
      ) : jobs.length === 0 ? (
        search.length > 0 ? (
          <EmptyState icon="search-outline" title="No matching jobs" description="Try a different search term." />
        ) : filter !== 'all' ? (
          <EmptyState icon="briefcase-outline" title="Nothing here yet" description="Jobs matching this filter will appear here." />
        ) : (
          <EmptyState
            icon="briefcase-outline"
            title="No jobs yet"
            description="Create your first job and turn your work into a professional report."
            actionLabel="Create job"
            onAction={() => router.push('/job/new')}
          />
        )
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.md }}
          renderItem={({ item }) => (
            <SwipeableJobCard
              job={item}
              photoCount={photoSummaries[item.id]?.count ?? 0}
              thumbnailUri={photoSummaries[item.id]?.thumbnailUri ?? null}
              onPress={() => router.push(`/job/${item.id}`)}
              onDuplicate={() => handleDuplicate(item)}
              onDelete={() => setJobToDelete(item)}
            />
          )}
        />
      )}

      <ConfirmationDialog
        visible={jobToDelete !== null}
        title="Delete this job?"
        description="This will permanently remove its information, photos and generated reports from this device."
        confirmLabel="Delete job"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setJobToDelete(null)}
        loading={deleting}
      />
    </View>
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
  const [expanded, setExpanded] = useState(false);
  const height = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({ height: height.value, opacity: height.value > 0 ? 1 : 0 }));

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    height.value = withTiming(next ? 44 : 0, { duration: 160 });
  };

  return (
    <View>
      <Pressable onLongPress={toggle} delayLongPress={300}>
        <JobCard job={job} photoCount={photoCount} thumbnailUri={thumbnailUri} onPress={onPress} />
      </Pressable>
      <Animated.View style={[styles.actionsRow, { gap: spacing.xs }, animatedStyle]}>
        <ActionChip icon="copy-outline" label="Duplicate" onPress={onDuplicate} />
        <ActionChip icon="trash-outline" label="Delete" onPress={onDelete} destructive />
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

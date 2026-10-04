import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/core/AppText';
import { Button } from '@/components/core/Button';
import { SectionHeader } from '@/components/core/SectionHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { JobCard } from '@/components/jobs/JobCard';
import type { Job, JobStatus, Photo, Report } from '@/models/domain';
import { databaseService } from '@/services/databaseService';
import { colors, radius, spacing } from '@/theme';

type JobBundle = {
  job: Job;
  cover: Photo | null;
  reports: Report[];
};

const filters: Array<{ label: string; value: JobStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Complete', value: 'complete' },
];

export default function JobsTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobBundle[]>([]);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    const list = await databaseService.listJobs(search, statusFilter);
    const entries = await Promise.all(
      list.map(async (job) => {
        const [photos, reports] = await Promise.all([databaseService.getPhotos(job.id), databaseService.listReportsByJob(job.id)]);
        return {
          job,
          cover: photos[0] ?? null,
          reports,
        };
      })
    );
    setJobs(entries);
    setLoading(false);
  }, [search, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const filteredCountText = useMemo(() => `${jobs.length} job${jobs.length === 1 ? '' : 's'}`, [jobs.length]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <SectionHeader
          title="Jobs"
          subtitle={filteredCountText}
          action={<Button label="+ New job" onPress={() => router.push('/jobs/new')} />}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search jobs, customers, references"
          placeholderTextColor={colors.textSecondary}
          style={styles.search}
          returnKeyType="search"
          onSubmitEditing={() => void load()}
          accessibilityLabel="Search jobs"
        />
        <View style={styles.filterRow}>
          {filters.map((filter) => (
            <Pressable
              key={filter.value}
              onPress={() => setStatusFilter(filter.value)}
              style={[styles.filterChip, statusFilter === filter.value && styles.filterChipActive]}>
              <AppText variant="caption" color={statusFilter === filter.value ? colors.textPrimary : colors.textSecondary}>
                {filter.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <LoadingState label="Loading jobs…" />
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No jobs yet"
            description="Create your first job and turn your work into a professional report."
            actionLabel="Create job"
            onAction={() => router.push('/jobs/new')}
          />
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={(item) => item.job.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <JobCard
                job={item.job}
                coverPhoto={item.cover}
                reports={item.reports}
                onPress={() => router.push(`/jobs/${item.job.id}`)}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  root: {
    flex: 1,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  filterChipActive: {
    borderColor: colors.cta,
  },
  list: {
    paddingBottom: spacing.x5,
    gap: spacing.md,
  },
});

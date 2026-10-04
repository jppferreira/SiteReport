import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  Button,
  ConfirmationDialog,
  ErrorState,
  IconButton,
  LoadingState,
  NavigationHeader,
  ProgressIndicator,
  Screen,
  Text,
  useToast,
} from '@/components';
import { jobsRepository, photosRepository } from '@/database';
import { BottomSheetMenu } from '@/features/jobs/BottomSheetMenu';
import { JobSectionRow } from '@/features/jobs/JobSectionRow';
import { nextRecommendedAction } from '@/features/jobs/jobProgress';
import { useJob } from '@/hooks/useJob';
import { useSignature } from '@/hooks/useSignature';
import { useWorkSummary } from '@/hooks/useWorkSummary';
import { deleteJobFiles } from '@/services/fileService';
import { useTheme } from '@/theme';
import { formatDate } from '@/utils/format';

export default function JobOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const { job, progress, loading, error, refresh } = useJob(id);
  const { summary } = useWorkSummary(id);
  const { signature } = useSignature(id);
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoCounts, setPhotoCounts] = useState({ before: 0, after: 0 });

  useFocusEffect(
    useCallback(() => {
      refresh();
      photosRepository.countPhotos(id).then(setPhotoCounts);
    }, [refresh, id])
  );

  if (loading && !job) {
    return (
      <Screen>
        <NavigationHeader title="Job" onBack={() => router.back()} />
        <LoadingState />
      </Screen>
    );
  }

  if (error || !job || !progress) {
    return (
      <Screen>
        <NavigationHeader title="Job" onBack={() => router.back()} />
        <ErrorState title="This job could not be found" description={error ?? undefined} onAction={refresh} />
      </Screen>
    );
  }

  const action = nextRecommendedAction(progress);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await jobsRepository.deleteJob(job.id);
      await deleteJobFiles(job.id);
      showToast({ message: 'Job deleted', tone: 'neutral' });
      router.replace('/(tabs)/jobs');
    } finally {
      setDeleting(false);
    }
  };

  const metaParts = [job.customerName, formatDate(job.jobDate)].filter(Boolean);

  return (
    <Screen>
      <NavigationHeader
        title="Job overview"
        onBack={() => router.back()}
        right={<IconButton name="ellipsis-horizontal" accessibilityLabel="More options" onPress={() => setMenuOpen(true)} />}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
        <Text variant="h1" style={{ marginTop: spacing.xs }}>
          {job.title}
        </Text>
        {metaParts.length > 0 ? (
          <Text variant="body" color={colors.textSecondary} style={{ marginTop: 4 }}>
            {metaParts.join(' · ')}
          </Text>
        ) : null}

        <View style={{ marginTop: spacing.xl }}>
          <ProgressIndicator completed={progress.completedCount} total={progress.totalCount} />
        </View>

        <View style={{ marginTop: spacing.xxl }}>
          <JobSectionRow
            icon="document-text-outline"
            title="Job details"
            subtitle={job.description ? job.description : 'Title, customer, address and date'}
            status={progress.sections.details}
            onPress={() => router.push(`/job/${job.id}/edit`)}
          />
          <JobSectionRow
            icon="camera-outline"
            title="Photos"
            subtitle={`Before · ${photoCounts.before}   After · ${photoCounts.after}`}
            status={progress.sections.photos}
            onPress={() => router.push(`/job/${job.id}/photos`)}
          />
          <JobSectionRow
            icon="create-outline"
            title="Work summary"
            subtitle={summary?.workCompleted ? truncate(summary.workCompleted) : 'Describe the work carried out'}
            status={progress.sections.summary}
            onPress={() => router.push(`/job/${job.id}/summary`)}
          />
          <JobSectionRow
            icon="create-outline"
            title="Signature"
            subtitle={signature ? `Signed by ${signature.customerName ?? 'customer'}` : 'Optional customer sign-off'}
            status={progress.sections.signature}
            onPress={() => router.push(`/job/${job.id}/signature`)}
          />
          <JobSectionRow
            icon="document-outline"
            title="Report"
            subtitle={
              progress.sections.report === 'complete'
                ? 'Up to date'
                : progress.sections.report === 'in_progress'
                  ? 'Job changed since last report'
                  : 'Not generated yet'
            }
            status={progress.sections.report}
            onPress={() => router.push(`/job/${job.id}/preview`)}
          />
        </View>
      </ScrollView>

      <View style={{ padding: spacing.lg, paddingTop: 0 }}>
        <Button
          label={action.label}
          onPress={() => {
            if (action.target === 'photos') router.push(`/job/${job.id}/photos`);
            else if (action.target === 'summary') router.push(`/job/${job.id}/summary`);
            else if (action.target === 'signature') router.push(`/job/${job.id}/signature`);
            else router.push(`/job/${job.id}/preview`);
          }}
        />
      </View>

      <BottomSheetMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={[
          { icon: 'create-outline', label: 'Edit job details', onPress: () => router.push(`/job/${job.id}/edit`) },
          {
            icon: 'trash-outline',
            label: 'Delete job',
            destructive: true,
            onPress: () => setConfirmDelete(true),
          },
        ]}
      />

      <ConfirmationDialog
        visible={confirmDelete}
        title="Delete this job?"
        description="This will permanently remove its information, photos and generated reports from this device."
        confirmLabel="Delete job"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        loading={deleting}
      />
    </Screen>
  );
}

function truncate(value: string, length = 60): string {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

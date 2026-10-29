import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import {
  Button,
  ConfirmationDialog,
  ErrorState,
  IconButton,
  LoadingState,
  NavigationHeader,
  Screen,
  Text,
  useToast,
} from '@/components';
import { jobsRepository, photoAreasRepository, photosRepository } from '@/database';
import { BottomSheetMenu } from '@/features/jobs/BottomSheetMenu';
import { JobSectionRow } from '@/features/jobs/JobSectionRow';
import { nextRecommendedAction } from '@/features/jobs/jobProgress';
import { useJob } from '@/hooks/useJob';
import { useSignature } from '@/hooks/useSignature';
import { useWorkSummary } from '@/hooks/useWorkSummary';
import { useI18n } from '@/i18n/useI18n';
import { deleteJobFiles } from '@/services/fileService';
import { useTheme } from '@/theme';
import { linesForReport, WorkSummary } from '@/models';
import { formatDate } from '@/utils/format';
import { goBack } from '@/utils/goBack';

export default function JobOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { job, progress, loading, error, refresh } = useJob(id);
  const { summary } = useWorkSummary(id);
  const { signature } = useSignature(id);
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoCounts, setPhotoCounts] = useState({ before: 0, after: 0 });
  const [areaCount, setAreaCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      refresh();
      photosRepository.countPhotos(id).then(setPhotoCounts);
      photoAreasRepository.countAreas(id).then(setAreaCount);
    }, [refresh, id])
  );

  if (loading && !job) {
    return (
      <Screen>
        <NavigationHeader title={t('jobDetail.title')} onBack={() => goBack('/(tabs)/jobs')} />
        <LoadingState />
      </Screen>
    );
  }

  if (error || !job || !progress) {
    return (
      <Screen>
        <NavigationHeader title={t('jobDetail.title')} onBack={() => goBack('/(tabs)/jobs')} />
        <ErrorState title={t('jobDetail.notFound')} description={error ?? undefined} onAction={refresh} />
      </Screen>
    );
  }

  const action = nextRecommendedAction(progress);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await jobsRepository.deleteJob(job.id);
      await deleteJobFiles(job.id);
      showToast({ message: t('jobDetail.toastDeleted'), tone: 'neutral' });
      router.replace('/(tabs)/jobs');
    } finally {
      setDeleting(false);
    }
  };

  const photoTotal = photoCounts.before + photoCounts.after;

  return (
    <Screen>
      <NavigationHeader
        title=""
        onBack={() => goBack('/(tabs)/jobs')}
        right={
          <IconButton
            name="ellipsis-horizontal"
            accessibilityLabel={t('jobDetail.moreOptionsA11y')}
            onPress={() => setMenuOpen(true)}
          />
        }
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
        <Text variant="h1">{job.title}</Text>
        {job.address ? (
          <Text variant="body" color={colors.textSecondary} style={{ marginTop: 4 }}>
            {job.address}
          </Text>
        ) : job.customerName ? (
          <Text variant="body" color={colors.textSecondary} style={{ marginTop: 4 }}>
            {job.customerName}
          </Text>
        ) : null}
        <Text variant="bodySmall" color={colors.textTertiary} style={{ marginTop: 2 }}>
          {formatDate(job.jobDate)}
        </Text>

        <Pressable
          onPress={() => router.push('/settings/data')}
          accessibilityRole="button"
          accessibilityLabel={t('jobDetail.localOnlyBanner')}
          style={{
            marginTop: spacing.lg,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            backgroundColor: colors.surfaceSunken,
            borderRadius: 12,
          }}
        >
          <Text variant="bodySmall" color={colors.textSecondary}>
            {t('jobDetail.localOnlyBanner')}
          </Text>
        </Pressable>

        <View
          style={{
            marginTop: spacing.xl,
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
          }}
        >
          <JobSectionRow
            title={t('jobDetail.sectionDetails')}
            subtitle={job.description ? truncate(job.description) : t('jobDetail.sectionDetailsSubtitle')}
            status={progress.sections.details}
            showDivider
            onPress={() => router.push(`/job/${job.id}/edit`)}
          />
          <JobSectionRow
            title={t('jobDetail.sectionPhotos')}
            subtitle={photosSubtitle(t, photoTotal, areaCount)}
            status={progress.sections.photos}
            showDivider
            onPress={() => router.push(`/job/${job.id}/photos`)}
          />
          <JobSectionRow
            title={t('jobDetail.sectionSummary')}
            subtitle={summarySubtitle(t, summary)}
            status={progress.sections.summary}
            showDivider
            onPress={() => router.push(`/job/${job.id}/summary`)}
          />
          <JobSectionRow
            title={t('jobDetail.sectionSignature')}
            subtitle={
              signature
                ? t('jobDetail.signatureSignedBy', {
                    name: signature.customerName ?? t('jobDetail.signatureSignedByClientFallback'),
                  })
                : t('jobDetail.signatureNotAdded')
            }
            status={progress.sections.signature}
            showDivider
            onPress={() => router.push(`/job/${job.id}/signature`)}
          />
          <JobSectionRow
            title={t('jobDetail.sectionGenerate')}
            subtitle={
              progress.sections.report === 'complete'
                ? t('jobDetail.reportPreviewShare')
                : progress.sections.report === 'in_progress'
                  ? t('jobDetail.reportChanged')
                  : t('jobDetail.reportReady')
            }
            status={progress.sections.report}
            onPress={() => router.push(`/job/${job.id}/preview`)}
          />
        </View>
      </ScrollView>

      <View style={{ padding: spacing.lg, paddingTop: 0 }}>
        <Button
          label={t('common.continue')}
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
          { icon: 'create-outline', label: t('jobDetail.editDetails'), onPress: () => router.push(`/job/${job.id}/edit`) },
          {
            icon: 'trash-outline',
            label: t('jobDetail.deleteJob'),
            destructive: true,
            onPress: () => setConfirmDelete(true),
          },
        ]}
      />

      <ConfirmationDialog
        visible={confirmDelete}
        title={t('jobDetail.deleteConfirmTitle')}
        description={t('jobDetail.deleteConfirmDescription')}
        confirmLabel={t('jobDetail.deleteConfirmLabel')}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        loading={deleting}
      />
    </Screen>
  );
}

type Translate = (key: string, options?: Record<string, string | number>) => string;

function photosSubtitle(t: Translate, photoTotal: number, areaCount: number): string {
  if (areaCount > 0) {
    const sections =
      areaCount === 1 ? t('jobDetail.photosOneSection') : t('jobDetail.photosSectionsCount', { count: areaCount });
    if (photoTotal === 0) return sections;
    const photos =
      photoTotal === 1 ? t('jobDetail.photosOnePhoto') : t('jobDetail.photosCount', { count: photoTotal });
    return t('jobDetail.photosSectionsAndPhotos', { sections, photos });
  }
  if (photoTotal > 0) {
    return photoTotal === 1
      ? t('jobDetail.photosOneAdded')
      : t('jobDetail.photosCountAdded', { count: photoTotal });
  }
  return t('jobDetail.photosEmptyHint');
}

function summarySubtitle(t: Translate, summary: WorkSummary | null): string {
  if (summary?.workCompleted?.trim()) return truncate(summary.workCompleted);
  if (summary && linesForReport(summary.pricing).length > 0) return t('jobDetail.summaryPricingAdded');
  return t('jobDetail.summaryEmpty');
}

function truncate(value: string, length = 60): string {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { IconButton, LoadingState, Text } from '@/components';
import {
  businessProfileRepository,
  documentsRepository,
  jobChecklistsRepository,
  jobsRepository,
  photoAreasRepository,
  photosRepository,
} from '@/database';
import { JobDocumentsCard } from '@/features/documents';
import { addressForMeta, computeGuidedChecklist } from '@/features/jobs/guidedChecklist';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useJobDocuments } from '@/hooks/useJobDocuments';
import { useJob } from '@/hooks/useJob';
import { useSignature } from '@/hooks/useSignature';
import { useWorkSummary } from '@/hooks/useWorkSummary';
import { useI18n } from '@/i18n/useI18n';
import { formatDateShort } from '@/utils/format';
import { useTheme } from '@/theme';

type JobDetailPaneContentProps = {
  jobId: string;
  onClose: () => void;
};

/**
 * Job overview content for iPad split view detail pane.
 * Shows job header, documents card, photos summary, and quick actions.
 */
export function JobDetailPaneContent({ jobId, onClose }: JobDetailPaneContentProps) {
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();
  const { isPro } = useEntitlement();
  const { job, progress, loading, error, refresh } = useJob(jobId);
  const { summary } = useWorkSummary(jobId);
  const { signature } = useSignature(jobId);
  const { documents, refreshOnFocus: refreshDocuments } = useJobDocuments(jobId);
  
  const [photoCounts, setPhotoCounts] = useState({ before: 0, during: 0, after: 0 });
  const [photoThumbs, setPhotoThumbs] = useState<string[]>([]);

  useEffect(() => {
    refresh();
    photosRepository.countPhotos(jobId).then(setPhotoCounts);
    photosRepository.listPhotos(jobId).then((photos) => {
      const thumbs = photos.slice(0, 4).map((p) => p.thumbnailUri);
      setPhotoThumbs(thumbs);
    });
    void refreshDocuments();
  }, [jobId, refresh, refreshDocuments]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState />
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Text variant="bodyLarge" color={colors.textSecondary}>
          {error || t('jobDetail.notFound')}
        </Text>
      </View>
    );
  }

  const guided = computeGuidedChecklist({ job, progress, checklist: null, documents, summary, signature });
  const metaAddress = addressForMeta(job.address);
  const dateLabel = formatDateShort(job.jobDate);
  const statusLabel = guided.allComplete
    ? t('jobs.statusComplete')
    : guided.completedCount > 0
      ? t('jobs.statusInProgress')
      : t('jobs.statusDraft');

  const totalPhotos = photoCounts.before + photoCounts.during + photoCounts.after;

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="title">{job.title}</Text>
          {metaAddress ? (
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
              {metaAddress}
            </Text>
          ) : null}
        </View>
        <IconButton name="close" accessibilityLabel={t('common.close')} onPress={onClose} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={[styles.metaCard, { backgroundColor: colors.surfaceSunken, borderRadius: radius.md, padding: spacing.md }]}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.textSecondary}>
                {t('jobDetail.sectionDetails')}
              </Text>
              <Text variant="body" style={{ marginTop: 4 }}>
                {dateLabel}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.textSecondary}>
                Status
              </Text>
              <Text variant="body" style={{ marginTop: 4 }}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {documents.length > 0 ? (
          <JobDocumentsCard
            jobId={jobId}
            documents={documents}
            onDocumentPress={(doc) => {
              router.push(`/document/${doc.id}`);
            }}
            onNewDocument={() => {
              router.push({ pathname: '/document/new', params: { jobId } });
            }}
            showNew={isPro}
          />
        ) : null}

        {totalPhotos > 0 ? (
          <Pressable
            onPress={() => router.push(`/job/${jobId}/photos`)}
            style={[
              styles.section,
              { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Ionicons name="images-outline" size={20} color={colors.textSecondary} />
              <Text variant="bodyMedium" style={{ marginLeft: spacing.xs }}>
                {t('jobDetail.sectionPhotos')}
              </Text>
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
            <Text variant="body" color={colors.textPrimary}>
              {totalPhotos} {totalPhotos === 1 ? t('common.photo') : t('common.photos')}
            </Text>
            {photoThumbs.length > 0 ? (
              <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm }}>
                {photoThumbs.map((uri, i) => (
                  <View
                    key={i}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: radius.sm,
                      backgroundColor: colors.surfaceSunken,
                    }}
                  >
                    {/* LocalImage would go here if we import it */}
                  </View>
                ))}
              </View>
            ) : null}
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => router.push(`/job/${jobId}`)}
          style={[
            styles.button,
            { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
          ]}
        >
          <Text variant="button" color={colors.accentOnAccent} style={{ textAlign: 'center' }}>
            {t('common.edit')}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  metaCard: {
    overflow: 'hidden',
  },
  section: {
    overflow: 'hidden',
  },
  button: {
    alignItems: 'center',
  },
});

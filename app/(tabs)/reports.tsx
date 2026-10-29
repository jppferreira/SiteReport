import { router, useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ConfirmationDialog, EmptyState, ErrorState, Screen, Skeleton, Text, useToast } from '@/components';
import { reportsRepository } from '@/database';
import { BottomSheetMenu } from '@/features/jobs/BottomSheetMenu';
import { RenameReportDialog } from '@/features/reports/RenameReportDialog';
import { ReportListItem } from '@/features/reports/ReportListItem';
import { ReportWithJob, useReports } from '@/hooks/useReports';
import { useI18n } from '@/i18n/useI18n';
import { deleteFileSafely } from '@/services/fileService';
import { openLocalFile, shareFile } from '@/services/shareService';
import { useTheme } from '@/theme';

export default function ReportsScreen() {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const tabBarHeight = useBottomTabBarHeight();
  const { items, loading, error, refresh } = useReports();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<ReportWithJob | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ReportWithJob | null>(null);
  const [renamingReport, setRenamingReport] = useState<ReportWithJob | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const { recent, earlier } = useMemo(() => {
    const recentItems: ReportWithJob[] = [];
    const earlierItems: ReportWithJob[] = [];
    // Grouping by recency intentionally reads the current time; a stale
    // group assignment on re-render has no visible impact for this UI.
    // eslint-disable-next-line react-hooks/purity
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const item of items) {
      if (new Date(item.report.generatedAt).getTime() >= cutoff) recentItems.push(item);
      else earlierItems.push(item);
    }
    return { recent: recentItems, earlier: earlierItems };
  }, [items]);

  const handlePreview = async (item: ReportWithJob) => {
    try {
      await openLocalFile(item.report.localPdfUri);
    } catch {
      showToast({ message: t('reports.toastOpenError'), tone: 'destructive' });
    }
  };

  const handleShare = async (item: ReportWithJob) => {
    try {
      const shared = await shareFile(item.report.localPdfUri, item.report.fileName);
      if (!shared) showToast({ message: t('reports.toastShareError'), tone: 'destructive' });
    } catch {
      showToast({ message: t('reports.toastShareError'), tone: 'destructive' });
    }
  };

  const handleRename = async (fileName: string) => {
    if (!renamingReport) return;
    setRenaming(true);
    try {
      await reportsRepository.updateReportFileName(renamingReport.report.id, fileName);
      setRenamingReport(null);
      refresh();
    } catch {
      showToast({ message: t('reports.toastRenameError'), tone: 'destructive' });
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteFileSafely(confirmDelete.report.localPdfUri);
      await reportsRepository.deleteReport(confirmDelete.report.id);
      showToast({ message: t('reports.toastDeleted'), tone: 'neutral' });
      setConfirmDelete(null);
      refresh();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xxl }}>
        <Text variant="display">{t('reports.title')}</Text>
      </View>

      {error ? (
        <View style={{ flex: 1, paddingBottom: tabBarHeight }}>
          <ErrorState title={t('reports.errorLoad')} description={error} onAction={refresh} />
        </View>
      ) : loading ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Skeleton height={276} radius={24} style={{ marginBottom: 12 }} />
          <Skeleton height={76} radius={16} />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, paddingBottom: tabBarHeight }}>
          <EmptyState
            icon="document-text-outline"
            title={t('reports.emptyTitle')}
            description={t('reports.emptyDescription')}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg + tabBarHeight }}>
          {recent.length > 0 ? (
            <View style={{ marginBottom: spacing.lg }}>
              <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
                {t('reports.recent')}
              </Text>
              {recent.map((item) => (
                <ReportListItem
                  key={item.report.id}
                  report={item.report}
                  jobTitle={item.job?.title ?? t('reports.deletedJob')}
                  isStale={item.isStale}
                  featured
                  coverUri={item.coverUri}
                  onPress={() => setSelected(item)}
                />
              ))}
            </View>
          ) : null}

          {earlier.length > 0 ? (
            <View>
              <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
                {t('reports.earlier')}
              </Text>
              {earlier.map((item) => (
                <ReportListItem
                  key={item.report.id}
                  report={item.report}
                  jobTitle={item.job?.title ?? t('reports.deletedJob')}
                  isStale={item.isStale}
                  onPress={() => setSelected(item)}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}

      <BottomSheetMenu
        visible={selected !== null}
        onClose={() => setSelected(null)}
        items={
          selected
            ? [
                { icon: 'eye-outline', label: t('reports.menuPreview'), onPress: () => handlePreview(selected) },
                { icon: 'pencil-outline', label: t('reports.menuRename'), onPress: () => setRenamingReport(selected) },
                { icon: 'share-outline', label: t('reports.menuShare'), onPress: () => handleShare(selected) },
                {
                  icon: 'refresh-outline',
                  label: t('reports.menuRegenerate'),
                  onPress: () => router.push(`/job/${selected.report.jobId}/preview`),
                },
                { icon: 'trash-outline', label: t('reports.menuDelete'), destructive: true, onPress: () => setConfirmDelete(selected) },
              ]
            : []
        }
      />

      <RenameReportDialog
        visible={renamingReport !== null}
        fileName={renamingReport?.report.fileName ?? ''}
        saving={renaming}
        onCancel={() => setRenamingReport(null)}
        onSubmit={handleRename}
      />

      <ConfirmationDialog
        visible={confirmDelete !== null}
        title={t('reports.deleteTitle')}
        description={t('reports.deleteDescription')}
        confirmLabel={t('reports.deleteConfirm')}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleting}
      />
    </Screen>
  );
}

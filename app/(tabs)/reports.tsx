import { router, useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ConfirmationDialog, EmptyState, ErrorState, Screen, SearchInput, Skeleton, Text, useToast } from '@/components';
import { reportsRepository } from '@/database';
import { BottomSheetMenu, BottomSheetMenuItem } from '@/features/jobs/BottomSheetMenu';
import { FirstReportPromptCard } from '@/features/jobs/FirstReportPromptCard';
import { RenameReportDialog } from '@/features/reports/RenameReportDialog';
import { ReportFilterChips } from '@/features/reports/ReportFilterChips';
import { ReportListItem } from '@/features/reports/ReportListItem';
import { ReportWithJob, useReports } from '@/hooks/useReports';
import { useI18n } from '@/i18n/useI18n';
import { ReportStatus } from '@/models';
import { deleteFileSafely } from '@/services/fileService';
import { openLocalFile, shareFile } from '@/services/shareService';
import { useTheme } from '@/theme';

export default function ReportsScreen() {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const tabBarHeight = useBottomTabBarHeight();
  const { items, hasReports, filter, setFilter, search, setSearch, loading, error, refresh, refreshSilently } = useReports();
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
      refreshSilently();
    } catch {
      showToast({ message: t('reports.toastRenameError'), tone: 'destructive' });
    } finally {
      setRenaming(false);
    }
  };

  const handleStatus = async (item: ReportWithJob, status: ReportStatus) => {
    try {
      await reportsRepository.updateReportStatus(item.report.id, status);
      const message =
        status === 'archived'
          ? t('reports.toastArchived')
          : status === 'draft'
            ? t('reports.toastDraft')
            : t('reports.toastActive');
      showToast({ message, tone: 'neutral' });
      refreshSilently();
    } catch {
      showToast({ message: t('reports.toastStatusError'), tone: 'destructive' });
    }
  };

  const menuItems = (item: ReportWithJob): BottomSheetMenuItem[] => {
    const statusItems: BottomSheetMenuItem[] = [];
    if (item.report.status !== 'active') {
      statusItems.push({
        icon: 'checkmark-circle-outline',
        label: t('reports.menuMarkActive'),
        onPress: () => handleStatus(item, 'active'),
      });
    }
    if (item.report.status !== 'draft') {
      statusItems.push({
        icon: 'document-text-outline',
        label: t('reports.menuMarkDraft'),
        onPress: () => handleStatus(item, 'draft'),
      });
    }
    if (item.report.status !== 'archived') {
      statusItems.push({
        icon: 'archive-outline',
        label: t('reports.menuArchive'),
        onPress: () => handleStatus(item, 'archived'),
      });
    }

    return [
      { icon: 'eye-outline', label: t('reports.menuPreview'), onPress: () => handlePreview(item) },
      { icon: 'pencil-outline', label: t('reports.menuRename'), onPress: () => setRenamingReport(item) },
      { icon: 'share-outline', label: t('reports.menuShare'), onPress: () => handleShare(item) },
      {
        icon: 'refresh-outline',
        label: t('reports.menuRegenerate'),
        onPress: () => router.push(`/job/${item.report.jobId}/preview`),
      },
      ...statusItems,
      { icon: 'trash-outline', label: t('reports.menuDelete'), destructive: true, onPress: () => setConfirmDelete(item) },
    ];
  };

  const emptyCopy =
    search.trim().length > 0
      ? { title: t('reports.emptyNoMatchTitle'), description: t('reports.emptyNoMatchDescription') }
      : hasReports || filter !== 'all'
        ? { title: t('reports.emptyFilteredTitle'), description: t('reports.emptyFilteredDescription') }
        : { title: t('reports.emptyTitle'), description: t('reports.emptyDescription') };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteFileSafely(confirmDelete.report.localPdfUri);
      await reportsRepository.deleteReport(confirmDelete.report.id);
      showToast({ message: t('reports.toastDeleted'), tone: 'neutral' });
      setConfirmDelete(null);
      refreshSilently();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.sm }}>
        <Text variant="display">{t('reports.title')}</Text>
        <View style={{ marginTop: spacing.md }}>
          <SearchInput value={search} onChangeText={setSearch} placeholder={t('reports.searchPlaceholder')} />
        </View>
        <View style={{ marginTop: spacing.sm }}>
          <ReportFilterChips value={filter} onChange={setFilter} />
        </View>
      </View>

      {error ? (
        <View style={{ flex: 1, paddingBottom: tabBarHeight }}>
          <ErrorState title={t('reports.errorLoad')} description={error} onAction={refresh} />
        </View>
      ) : loading ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Skeleton height={96} radius={16} style={{ marginBottom: 12 }} />
          <Skeleton height={96} radius={16} />
        </View>
      ) : items.length === 0 ? (
        !hasReports && filter === 'all' && search.trim().length === 0 ? (
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: spacing.lg + tabBarHeight,
            }}
          >
            <FirstReportPromptCard onPress={() => router.push('/job/new')} />
          </View>
        ) : (
          <View style={{ flex: 1, paddingBottom: tabBarHeight }}>
            <EmptyState icon="document-text-outline" title={emptyCopy.title} description={emptyCopy.description} />
          </View>
        )
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg + tabBarHeight }}
        >
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
                  coverUri={item.coverUri}
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
        items={selected ? menuItems(selected) : []}
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

import * as Print from 'expo-print';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ConfirmationDialog, EmptyState, ErrorState, Skeleton, Text, useToast } from '@/components';
import { reportsRepository } from '@/database';
import { BottomSheetMenu } from '@/features/jobs/BottomSheetMenu';
import { ReportListItem } from '@/features/reports/ReportListItem';
import { ReportWithJob, useReports } from '@/hooks/useReports';
import { deleteFileSafely } from '@/services/fileService';
import { shareFile } from '@/services/shareService';
import { useTheme } from '@/theme';

export default function ReportsScreen() {
  const { colors, spacing } = useTheme();
  const { items, loading, error, refresh } = useReports();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<ReportWithJob | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ReportWithJob | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      await Print.printAsync({ uri: item.report.localPdfUri });
    } catch {
      showToast({ message: "We couldn't open this report", tone: 'destructive' });
    }
  };

  const handleShare = async (item: ReportWithJob) => {
    const shared = await shareFile(item.report.localPdfUri, item.report.fileName);
    if (!shared) showToast({ message: 'Sharing is not available on this device', tone: 'warning' });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteFileSafely(confirmDelete.report.localPdfUri);
      await reportsRepository.deleteReport(confirmDelete.report.id);
      showToast({ message: 'Report deleted', tone: 'neutral' });
      setConfirmDelete(null);
      refresh();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Text variant="display">Reports</Text>
      </View>

      {error ? (
        <ErrorState title="We couldn't load your reports" description={error} onAction={refresh} />
      ) : loading ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Skeleton height={76} radius={16} style={{ marginBottom: 12 }} />
          <Skeleton height={76} radius={16} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="No reports yet"
          description="Generate your first report from a job to see it here."
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.md }}>
          {recent.length > 0 ? (
            <View style={{ marginBottom: spacing.lg }}>
              <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
                RECENT
              </Text>
              {recent.map((item) => (
                <ReportListItem
                  key={item.report.id}
                  report={item.report}
                  jobTitle={item.job?.title ?? 'Deleted job'}
                  isStale={item.isStale}
                  onPress={() => setSelected(item)}
                />
              ))}
            </View>
          ) : null}

          {earlier.length > 0 ? (
            <View>
              <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
                EARLIER
              </Text>
              {earlier.map((item) => (
                <ReportListItem
                  key={item.report.id}
                  report={item.report}
                  jobTitle={item.job?.title ?? 'Deleted job'}
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
                { icon: 'eye-outline', label: 'Preview', onPress: () => handlePreview(selected) },
                { icon: 'share-outline', label: 'Share', onPress: () => handleShare(selected) },
                {
                  icon: 'refresh-outline',
                  label: 'Regenerate',
                  onPress: () => router.push(`/job/${selected.report.jobId}/generate`),
                },
                { icon: 'trash-outline', label: 'Delete', destructive: true, onPress: () => setConfirmDelete(selected) },
              ]
            : []
        }
      />

      <ConfirmationDialog
        visible={confirmDelete !== null}
        title="Delete this report?"
        description="The PDF will be permanently removed from this device. The job itself will not be affected."
        confirmLabel="Delete report"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleting}
      />
    </View>
  );
}

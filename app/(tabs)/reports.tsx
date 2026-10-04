import * as Sharing from 'expo-sharing';
import { useFocusEffect, useRouter } from 'expo-router';
import { isAfter, parseISO, subDays } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/core/AppText';
import { Button } from '@/components/core/Button';
import { Card } from '@/components/core/Card';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import type { Job, Report } from '@/models/domain';
import { databaseService } from '@/services/databaseService';
import { fileService } from '@/services/fileService';
import { colors, spacing } from '@/theme';
import { formatJobDate } from '@/utils/date';
import { formatBytes } from '@/utils/format';

type ReportItem = {
  report: Report;
  job: Job | null;
};

export default function ReportsTab() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReportItem[]>([]);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    const reports = await databaseService.listReports();
    const next = await Promise.all(
      reports.map(async (report) => ({
        report,
        job: await databaseService.getJob(report.jobId),
      }))
    );
    setItems(next);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const grouped = useMemo(() => {
    const threshold = subDays(new Date(), 7);
    const recent = items.filter((item) => isAfter(parseISO(item.report.generatedAt), threshold));
    const earlier = items.filter((item) => !isAfter(parseISO(item.report.generatedAt), threshold));
    return { recent, earlier };
  }, [items]);

  const shareReport = async (uri: string) => {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      return;
    }
    await Sharing.shareAsync(uri);
  };

  const deleteReport = async (reportId: string) => {
    const uri = await databaseService.deleteReport(reportId);
    await fileService.deleteUri(uri);
    await load();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState label="Loading reports…" />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.root}>
          <EmptyState
            title="No reports yet"
            description="Generate your first job report to see it here."
            actionLabel="Go to jobs"
            onAction={() => router.push('/(tabs)/jobs')}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        style={styles.root}
        contentContainerStyle={styles.list}
        data={[
          ...(grouped.recent.length > 0 ? [{ type: 'header', label: 'Recent' as const }] : []),
          ...grouped.recent.map((item) => ({ type: 'item' as const, item })),
          ...(grouped.earlier.length > 0 ? [{ type: 'header', label: 'Earlier' as const }] : []),
          ...grouped.earlier.map((item) => ({ type: 'item' as const, item })),
        ]}
        keyExtractor={(entry, index) => ('item' in entry ? entry.item.report.id : `header-${entry.label}-${index}`)}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <AppText variant="h3" style={styles.header}>
                {item.label}
              </AppText>
            );
          }

          const { report, job } = item.item;
          return (
            <Card style={styles.card}>
              <AppText variant="h3">{job?.title ?? 'Deleted job'}</AppText>
              <AppText variant="bodySmall" color={colors.textSecondary}>
                {formatJobDate(report.generatedAt)} · {formatBytes(report.fileSize)}
              </AppText>
              <View style={styles.actions}>
                <Button
                  label="Preview"
                  variant="secondary"
                  onPress={() => {
                    if (job) router.push(`/jobs/${job.id}/preview`);
                  }}
                />
                <Button label="Share" onPress={() => void shareReport(report.localPdfUri)} />
              </View>
              <View style={styles.secondaryActions}>
                <Pressable onPress={() => (job ? router.push(`/jobs/${job.id}/preview`) : undefined)}>
                  <AppText variant="caption" color={colors.textSecondary}>
                    Regenerate
                  </AppText>
                </Pressable>
                <Pressable onPress={() => void deleteReport(report.id)}>
                  <AppText variant="caption" color={colors.destructive}>
                    Delete
                  </AppText>
                </Pressable>
              </View>
            </Card>
          );
        }}
      />
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
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.x5,
  },
  header: {
    marginTop: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
});

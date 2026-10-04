import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { AppText } from '@/components/core/AppText';
import { Button } from '@/components/core/Button';
import { Card } from '@/components/core/Card';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { canGenerateReport } from '@/features/reports/freeLimit';
import { useAppState } from '@/hooks/useAppState';
import type { Report } from '@/models/domain';
import { databaseService } from '@/services/databaseService';
import { reportService } from '@/services/reportService';
import { colors, spacing } from '@/theme';
import { formatBytes } from '@/utils/format';

export default function JobPreviewScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const { entitlement } = useAppState();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState<string>('');
  const [report, setReport] = useState<Report | null>(null);
  const [reportUri, setReportUri] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!jobId) {
      setError('Job not found');
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const [previewHtml, latestReports] = await Promise.all([
          reportService.buildPreviewHtml(jobId),
          databaseService.listReportsByJob(jobId),
        ]);
        if (!mounted) return;
        setHtml(previewHtml);
        setReport(latestReports[0] ?? null);
      } catch (previewError) {
        if (!mounted) return;
        setError(previewError instanceof Error ? previewError.message : 'Unable to build report preview');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [jobId]);

  const generate = async () => {
    if (!jobId) return;
    setGenerating(true);
    setError(null);
    try {
      const generatedCount = await databaseService.getGeneratedReportCount();
      if (!canGenerateReport(entitlement.hasProAccess, generatedCount)) {
        setGenerating(false);
        router.push('/paywall');
        return;
      }

      const result = await reportService.generatePdf(jobId);
      setReport(result.report);
      setReportUri(result.uri);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "We couldn't create this report.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setGenerating(false);
    }
  };

  const share = async () => {
    const uri = reportUri ?? report?.localPdfUri;
    if (!uri) return;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState label="Preparing preview…" />
      </SafeAreaView>
    );
  }

  if (error && !html) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState title="We couldn't create this preview" description={error} actionLabel="Try again" onAction={() => router.replace(`/jobs/${jobId}/preview`)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.webWrap}>
          <WebView source={{ html }} originWhitelist={['*']} style={styles.webview} />
        </View>

        <Card style={styles.footerCard}>
          {error ? (
            <AppText variant="caption" color={colors.destructive}>
              {error}
            </AppText>
          ) : null}
          {report ? (
            <View style={styles.reportInfo}>
              <AppText variant="body">Your report is ready</AppText>
              <AppText variant="bodySmall" color={colors.textSecondary}>
                {report.localPdfUri.split('/').pop()} · {formatBytes(report.fileSize)}
              </AppText>
            </View>
          ) : null}
          <Button
            label={generating ? 'Creating your report…' : 'Generate PDF'}
            loading={generating}
            onPress={() => void generate()}
            disabled={generating}
          />
          <Button label="Share report" variant="secondary" onPress={() => void share()} disabled={!report} />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  webWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  footerCard: {
    gap: spacing.sm,
  },
  reportInfo: {
    gap: spacing.xxs,
  },
});

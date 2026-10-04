import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, ErrorState, NavigationHeader, Screen, Text, useToast } from '@/components';
import { Report } from '@/models';
import { generateReportPdf, ReportGenerationError } from '@/services/pdfService';
import { saveFileCopy, shareFile } from '@/services/shareService';
import { useTheme } from '@/theme';
import { formatFileSize } from '@/utils/format';

type GenerationState = 'working' | 'success' | 'error';

export default function GenerateReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius } = useTheme();
  const { showToast } = useToast();
  const [state, setState] = useState<GenerationState>('working');
  const [report, setReport] = useState<Report | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);

  const run = useCallback(async () => {
    setState('working');
    setErrorMessage(null);
    try {
      const result = await generateReportPdf(id);
      setReport(result);
      setState('success');
    } catch (error) {
      setErrorMessage(
        error instanceof ReportGenerationError
          ? error.message
          : "We couldn't create this report. Your job is safe — try generating the report again."
      );
      setState('error');
    }
  }, [id]);

  useEffect(() => {
    // Kick off report generation on mount; `run` manages its own state
    // transitions (working/success/error) as an external async operation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run();
  }, [run]);

  const handleShare = async () => {
    if (!report) return;
    setSharing(true);
    try {
      const shared = await shareFile(report.localPdfUri, report.fileName);
      if (!shared) {
        showToast({ message: 'Sharing is not available on this device', tone: 'warning' });
      }
    } finally {
      setSharing(false);
    }
  };

  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    try {
      const result = await saveFileCopy(report.localPdfUri, report.fileName);
      if (result === 'saved') {
        showToast({ message: 'Report saved', tone: 'success' });
      } else if (result === 'error') {
        showToast({ message: "We couldn't save the report", tone: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <NavigationHeader
        title="Report"
        onBack={() => router.replace(`/job/${id}`)}
      />
      <View style={{ flex: 1, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' }}>
        {state === 'working' ? (
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.textPrimary} />
            <Text variant="h3" style={{ marginTop: spacing.lg }}>
              Creating your report…
            </Text>
            <Text variant="body" color={colors.textSecondary} style={{ marginTop: 8, textAlign: 'center' }}>
              This happens entirely on your device.
            </Text>
          </View>
        ) : state === 'error' ? (
          <ErrorState title="We couldn't create this report" description={errorMessage ?? undefined} onAction={run} />
        ) : (
          <View style={{ alignItems: 'center', width: '100%' }}>
            <View style={[styles.successBadge, { backgroundColor: colors.accentSoft, borderRadius: radius.pill }]}>
              <Ionicons name="checkmark" size={28} color={colors.accentPressed} />
            </View>
            <Text variant="h2" style={{ marginTop: spacing.lg }}>
              Your report is ready
            </Text>

            <View
              style={[
                styles.fileCard,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, marginTop: spacing.xl },
              ]}
            >
              <View style={[styles.fileIcon, { backgroundColor: colors.surfaceSunken, borderRadius: radius.md }]}>
                <Ionicons name="document-text" size={24} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="bodyMedium" numberOfLines={1}>
                  {report?.fileName}
                </Text>
                <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  {report ? formatFileSize(report.fileSize) : ''}
                </Text>
              </View>
            </View>

            <View style={{ width: '100%', marginTop: spacing.xl, gap: spacing.xs }}>
              <Button label="Share report" onPress={handleShare} loading={sharing} />
              <Button label="Save a copy" variant="secondary" onPress={handleSave} loading={saving} />
              <Button label="Done" variant="tertiary" onPress={() => router.replace(`/job/${id}`)} />
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  successBadge: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    padding: 16,
  },
  fileIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

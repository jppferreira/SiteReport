import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Button, ErrorState, NavigationHeader, Screen, Text, useToast } from '@/components';
import { reportsRepository } from '@/database';
import { RenameReportDialog } from '@/features/reports/RenameReportDialog';
import { normalizeReportTemplateId, Report, ReportTemplateId } from '@/models';
import { runIcloudAutoBackup } from '@/services/backup/icloudAutoBackup';
import { goBack } from '@/utils/goBack';
import { generateReportPdf, ReportGenerationError, reportTemplateLabel } from '@/services/pdfService';
import { saveFileCopy, shareFile } from '@/services/shareService';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { formatFileSize } from '@/utils/format';
import { logger } from '@/utils/logger';

const REPORT_READY = require('../../../assets/images/report-ready.png');

type GenerationState = 'working' | 'success' | 'error';

export default function GenerateReportScreen() {
  const { id, template: templateParam } = useLocalSearchParams<{ id: string; template?: string }>();
  const template: ReportTemplateId = normalizeReportTemplateId(templateParam);
  const { colors, spacing, radius, shadows } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [state, setState] = useState<GenerationState>('working');
  const [report, setReport] = useState<Report | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const leave = useCallback(() => {
    if (router.canDismiss()) {
      router.dismissTo(`/job/${id}`);
      return;
    }
    goBack(`/job/${id}`);
  }, [id]);

  const run = useCallback(async () => {
    setState('working');
    setErrorMessage(null);
    try {
      const result = await generateReportPdf(id, template);
      setReport(result);
      setState('success');
      if (Platform.OS === 'ios') void runIcloudAutoBackup('report');
    } catch (error) {
      logger.error('Report generation failed', error);
      setErrorMessage(
        error instanceof ReportGenerationError
          ? error.message
          : t('generate.errorFallback')
      );
      setState('error');
    }
  }, [id, template, t]);

  useEffect(() => {
    // Kick off report generation on mount; `run` manages its own state
    // transitions (working/success/error) as an external async operation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run();
  }, [run]);

  const handleRename = async (fileName: string) => {
    if (!report) return;
    setRenaming(true);
    try {
      await reportsRepository.updateReportFileName(report.id, fileName);
      setReport({ ...report, fileName });
      setRenameOpen(false);
    } catch {
      showToast({ message: t('generate.toastRenameError'), tone: 'destructive' });
    } finally {
      setRenaming(false);
    }
  };

  const handleShare = async () => {
    if (!report) return;
    setSharing(true);
    try {
      const shared = await shareFile(report.localPdfUri, report.fileName);
      if (!shared) {
        showToast({ message: t('generate.toastShareError'), tone: 'destructive' });
      }
    } catch {
      showToast({ message: t('generate.toastShareError'), tone: 'destructive' });
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
        showToast({ message: t('generate.toastSaved'), tone: 'success' });
      } else if (result === 'error') {
        showToast({ message: t('generate.toastSaveError'), tone: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      {/* Safe area is already applied. This extra gap keeps the nav off the top of the screen. */}
      <View style={{ paddingTop: spacing.lg, backgroundColor: colors.background }}>
        <NavigationHeader
          title={t('generate.title')}
          left={<HeaderBack onPress={leave} />}
          right={state === 'success' ? <HeaderDone onPress={leave} /> : null}
        />
      </View>

      {state === 'working' ? (
        <View style={[styles.body, { paddingHorizontal: spacing.lg, gap: spacing.xl }]} accessibilityRole="progressbar">
          <CreatingReportMark />
          <View style={styles.copy}>
            <Text variant="h2" style={styles.centered}>
              {t('generate.creatingTitle')}
            </Text>
            <Text variant="body" color={colors.textSecondary} style={styles.centered}>
              {t('generate.creatingBody')}
            </Text>
          </View>
        </View>
      ) : state === 'error' ? (
        <ErrorState title={t('generate.errorTitle')} description={errorMessage ?? undefined} onAction={run} />
      ) : (
        <>
          <View style={[styles.body, { paddingHorizontal: spacing.lg, paddingTop: spacing.huge, gap: spacing.xl }]}>
            <Image
              source={REPORT_READY}
              contentFit="contain"
              accessible={false}
              style={styles.illustration}
            />
            <View style={styles.copy}>
              <Text variant="h2" style={styles.centered}>
                {t('generate.readyTitle')}
              </Text>
              <Text variant="body" color={colors.textSecondary} style={styles.centered}>
                {t('generate.readyBody')}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.footer,
              {
                paddingHorizontal: spacing.lg,
                paddingBottom: spacing.xxl,
                gap: spacing.lg,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={report ? t('generate.renameNamedA11y', { fileName: report.fileName }) : t('generate.renameA11y')}
              onPress={() => setRenameOpen(true)}
              style={[
                styles.fileCard,
                shadows.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  gap: spacing.sm,
                  padding: spacing.sm,
                },
              ]}
            >
              <ReportPageThumb />
              <View style={styles.fileMeta}>
                <Text variant="bodyMedium" numberOfLines={1}>
                  {report?.fileName}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {report ? `${reportTemplateLabel(template)} · ${formatFileSize(report.fileSize)}` : ''}
                </Text>
              </View>
              <Ionicons name="pencil" size={18} color={colors.textTertiary} />
            </Pressable>

            <View style={styles.actions}>
              <Button label={t('generate.share')} onPress={handleShare} loading={sharing} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('generate.saveCopy')}
                disabled={saving}
                onPress={handleSave}
                style={({ pressed }) => [styles.saveCopy, { opacity: saving ? 0.5 : pressed ? 0.6 : 1 }]}
              >
                <Text variant="button" color={colors.textSecondary}>
                  {t('generate.saveCopy')}
                </Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {report ? (
        <RenameReportDialog
          visible={renameOpen}
          fileName={report.fileName}
          saving={renaming}
          onCancel={() => setRenameOpen(false)}
          onSubmit={handleRename}
        />
      ) : null}
    </Screen>
  );
}

function HeaderBack({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('generate.goBackA11y')}
      onPress={onPress}
      hitSlop={12}
      style={styles.headerIcon}
    >
      <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
    </Pressable>
  );
}

function HeaderDone({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('generate.doneA11y')} onPress={onPress} hitSlop={12}>
      <Text variant="button">{t('common.done')}</Text>
    </Pressable>
  );
}

function ReportPageThumb() {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        styles.thumb,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.sm },
      ]}
    >
      <View style={[styles.thumbCover, { backgroundColor: colors.accent }]} />
      <View style={styles.thumbLines}>
        <View style={[styles.rule, { width: 40, backgroundColor: colors.skeleton }]} />
        <View style={[styles.rule, { width: 28, backgroundColor: colors.skeleton }]} />
        <View style={[styles.rule, { width: 34, backgroundColor: colors.skeleton }]} />
        <View style={[styles.thumbPhoto, { backgroundColor: colors.surfaceSunken }]} />
      </View>
    </View>
  );
}

const WRITE_LINES = [
  { width: 72, start: 0.08 },
  { width: 52, start: 0.28 },
  { width: 64, start: 0.48 },
];

/** Document mark that fills in while the PDF is built. Stays still when Reduce Motion is on. */
function CreatingReportMark() {
  const { colors, radius, shadows } = useTheme();
  const progress = useSharedValue(1);

  useEffect(() => {
    let cancelled = false;
    const hold = () => {
      progress.value = 1;
    };
    const loop = () => {
      if (cancelled) return;
      progress.value = 0;
      progress.value = withRepeat(
        withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.cubic) }),
        -1,
        false
      );
    };

    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((enabled) => {
        if (enabled) hold();
        else loop();
      })
      .catch(loop);

    return () => {
      cancelled = true;
    };
  }, [progress]);

  const coverStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 0.4], [28, 104], Extrapolation.CLAMP),
  }));

  return (
    <View style={styles.markSlot} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.pageShadow, shadows.card, { borderRadius: radius.md }]}>
        <View
          style={[
            styles.page,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md },
          ]}
        >
          <View style={styles.pageCover}>
            <Animated.View style={[styles.coverFill, { backgroundColor: colors.accent }, coverStyle]} />
          </View>
          <View style={styles.pageLines}>
            {WRITE_LINES.map((line) => (
              <WrittenLine key={line.start} progress={progress} width={line.width} start={line.start} color={colors.skeleton} />
            ))}
            <WrittenBlock progress={progress} color={colors.surfaceSunken} />
          </View>
        </View>
      </View>
    </View>
  );
}

function WrittenLine({
  progress,
  width,
  start,
  color,
}: {
  progress: SharedValue<number>;
  width: number;
  start: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const amount = interpolate(progress.value, [start, start + 0.22], [0, 1], Extrapolation.CLAMP);
    return { width: width * amount, opacity: 0.35 + amount * 0.65 };
  });
  return <Animated.View style={[styles.writtenLine, { backgroundColor: color }, style]} />;
}

function WrittenBlock({ progress, color }: { progress: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.68, 0.9], [0, 1], Extrapolation.CLAMP),
  }));
  return <Animated.View style={[styles.writtenBlock, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    alignItems: 'center',
    gap: 8,
  },
  centered: {
    textAlign: 'center',
  },
  illustration: {
    width: 132,
    height: 176,
  },
  footer: {
    width: '100%',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
  },
  fileMeta: {
    flex: 1,
    gap: 2,
  },
  actions: {
    width: '100%',
    gap: 8,
  },
  saveCopy: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  headerIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 64,
    height: 84,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbCover: {
    height: 22,
    width: '100%',
  },
  thumbLines: {
    paddingTop: 8,
    paddingHorizontal: 8,
    gap: 5,
  },
  rule: {
    height: 4,
    borderRadius: 2,
  },
  thumbPhoto: {
    width: 22,
    height: 14,
    borderRadius: 2,
  },
  markSlot: {
    width: 132,
    height: 176,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageShadow: {
    width: 104,
    height: 140,
  },
  page: {
    flex: 1,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pageCover: {
    height: 32,
    width: '100%',
    overflow: 'hidden',
  },
  coverFill: {
    height: 32,
  },
  pageLines: {
    paddingTop: 16,
    paddingHorizontal: 14,
    gap: 8,
  },
  writtenLine: {
    height: 6,
    borderRadius: 3,
  },
  writtenBlock: {
    width: 40,
    height: 22,
    borderRadius: 3,
    marginTop: 4,
  },
});

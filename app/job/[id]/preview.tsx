import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BottomSheet,
  Button,
  ErrorState,
  IconButton,
  LoadingState,
  NavigationHeader,
  Screen,
  StatusBadge,
  Text,
} from '@/components';
import { reportsRepository } from '@/database';
import { HtmlReportPreview } from '@/features/reports/HtmlReportPreview';
import { TemplatePicker } from '@/features/reports/TemplatePicker';
import { useEntitlement } from '@/hooks/useEntitlement';
import {
  DEFAULT_REPORT_TEMPLATE,
  isFreeReportTemplate,
  isReportTemplateId,
  ReportTemplateId,
  templateAllowedForTier,
} from '@/models';
import { canGenerateReportForJob, hasProAccess } from '@/services/entitlementService';
import {
  buildReportPreviewHtml,
  getReportFreshness,
  loadReportDocument,
  ReportDocument,
  ReportGenerationError,
  reportTemplateLabel,
} from '@/services/pdfService';
import { getPreferences, savePreferences } from '@/services/preferencesService';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

export default function ReportPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, radius, spacing, shadows } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { isPro } = useEntitlement();
  const [template, setTemplate] = useState<ReportTemplateId>(DEFAULT_REPORT_TEMPLATE);
  const [document, setDocument] = useState<ReportDocument | null>(null);
  const [savedTemplate, setSavedTemplate] = useState<ReportTemplateId | null>(null);
  const [reportState, setReportState] = useState<'none' | 'stale' | 'fresh'>('none');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Style tray opens with the preview so users can pick a layout, then drag it
  // down for a full-screen look at the PDF.
  const [stylesOpen, setStylesOpen] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [doc, freshness, latest, preferences, pro] = await Promise.all([
        loadReportDocument(id),
        getReportFreshness(id),
        reportsRepository.getLatestReportForJob(id),
        getPreferences(),
        hasProAccess(),
      ]);
      setDocument(doc);
      setReportState(freshness);
      setSavedTemplate(latest?.templateId ?? null);
      setTemplate(templateAllowedForTier(preferences.reportTemplate, pro));
      setStylesOpen(true);
    } catch (error) {
      logger.error('Report preview failed', error);
      setDocument(null);
      setErrorMessage(
        error instanceof ReportGenerationError
          ? error.message
          : t('preview.errorFallback')
      );
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const html = useMemo(
    () => (document ? buildReportPreviewHtml({ ...document.htmlInput, template }) : ''),
    [document, template]
  );

  const templateMismatch = reportState === 'fresh' && savedTemplate !== null && savedTemplate !== template;

  const chooseTemplate = (key: string) => {
    if (!isReportTemplateId(key) || key === template) return;
    if (!isPro && !isFreeReportTemplate(key)) {
      router.push({ pathname: '/paywall', params: { trigger: 'template' } });
      return;
    }
    setTemplate(key);
    void savePreferences({ reportTemplate: key });
  };

  const handleGenerate = async () => {
    const allowed = await canGenerateReportForJob(id);
    if (!allowed) {
      router.push({ pathname: '/paywall', params: { trigger: 'free_limit' } });
      return;
    }
    router.push(`/job/${id}/generate?template=${template}`);
  };

  const ctaLabel =
    reportState === 'none'
      ? t('preview.createPdf')
      : reportState === 'stale' || templateMismatch
        ? t('preview.updateReport')
        : t('preview.regenerateReport');

  return (
    <Screen edges={['top', 'left', 'right']}>
      <NavigationHeader
        title={t('preview.title')}
        onBack={() => router.back()}
        right={
          document && !loading && !errorMessage ? (
            <IconButton
              name="color-palette-outline"
              accessibilityLabel={t('preview.changeStyleA11y')}
              onPress={() => setStylesOpen(true)}
            />
          ) : null
        }
      />
      {loading ? (
        <LoadingState label={t('preview.preparing')} />
      ) : errorMessage || !document ? (
        <ErrorState
          title={t('preview.errorTitle')}
          description={errorMessage ?? undefined}
          onAction={load}
        />
      ) : (
        <View style={styles.body}>
          <View style={[styles.preview, { backgroundColor: colors.surfaceSunken }]}>
            <HtmlReportPreview html={html} />
          </View>

          {!stylesOpen ? (
            <View
              pointerEvents="box-none"
              style={[
                styles.dock,
                {
                  paddingHorizontal: spacing.lg,
                  paddingTop: spacing.sm,
                  paddingBottom: Math.max(insets.bottom, spacing.lg),
                  backgroundColor: colors.background,
                  borderTopColor: colors.border,
                },
                shadows.floating,
              ]}
            >
              {reportState !== 'none' ? (
                <View style={{ marginBottom: spacing.sm, alignItems: 'center' }}>
                  <StatusBadge
                    label={
                      reportState === 'stale'
                        ? t('preview.badgeStale')
                        : templateMismatch
                          ? t('preview.badgeNewTemplate')
                          : t('preview.badgeUpToDate')
                    }
                    tone={reportState === 'fresh' && !templateMismatch ? 'success' : 'warning'}
                  />
                </View>
              ) : null}

              <Pressable
                onPress={() => setStylesOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={t('preview.styleChipA11y', { style: reportTemplateLabel(template) })}
                style={({ pressed }) => [
                  styles.styleChip,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: radius.md,
                    opacity: pressed ? 0.85 : 1,
                    marginBottom: spacing.sm,
                  },
                ]}
              >
                <View style={styles.styleChipCopy}>
                  <Text variant="caption" color={colors.textTertiary}>
                    {t('preview.styleLabel')}
                  </Text>
                  <Text variant="bodyMedium" color={colors.textPrimary} numberOfLines={1}>
                    {reportTemplateLabel(template)}
                  </Text>
                </View>
                <Ionicons name="chevron-up" size={18} color={colors.textSecondary} />
              </Pressable>

              <Button label={ctaLabel} onPress={handleGenerate} />
            </View>
          ) : null}

          <BottomSheet visible={stylesOpen} onClose={() => setStylesOpen(false)}>
            <Text variant="h3" style={{ marginBottom: spacing.xs }}>
              {t('preview.stylesTitle')}
            </Text>
            <Text variant="body" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
              {t('preview.stylesDescription')}
            </Text>
            <TemplatePicker
              compact
              showDescription
              value={template}
              savedId={savedTemplate ?? undefined}
              onChange={chooseTemplate}
              isPro={isPro}
              onLocked={() => router.push({ pathname: '/paywall', params: { trigger: 'template' } })}
            />
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <Button label={ctaLabel} onPress={handleGenerate} />
              <Button label={t('preview.done')} variant="secondary" onPress={() => setStylesOpen(false)} />
            </View>
          </BottomSheet>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  preview: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  styleChipCopy: {
    flex: 1,
    gap: 2,
  },
});

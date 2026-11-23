import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
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
  SegmentedControl,
  StatusBadge,
  Text,
} from '@/components';
import { jobsRepository, reportsRepository } from '@/database';
import { BottomSheetMenu } from '@/features/jobs/BottomSheetMenu';
import { CoverPickerSheet } from '@/features/reports/CoverPickerSheet';
import { HtmlReportPreview } from '@/features/reports/HtmlReportPreview';
import type { ReportPreviewEditEvent } from '@/features/reports/previewEdit';
import { ReviewLinkSetting } from '@/features/reports/ReviewLinkSetting';
import { TemplatePicker } from '@/features/reports/TemplatePicker';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useWorkSummary } from '@/hooks/useWorkSummary';
import {
  DEFAULT_REPORT_TEMPLATE,
  DocumentType,
  isFreeReportTemplate,
  isReportTemplateId,
  normalizePhotoAnnotationLayout,
  PhotoAnnotationLayout,
  ReportTemplateId,
  ReviewProvider,
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
  const { profile, save: saveProfile } = useBusinessProfile();
  const { summary } = useWorkSummary(id);
  const [template, setTemplate] = useState<ReportTemplateId>(DEFAULT_REPORT_TEMPLATE);
  const [photoLayout, setPhotoLayout] = useState<PhotoAnnotationLayout>('fullWidth');
  const [includeReviewLink, setIncludeReviewLink] = useState(true);
  const [document, setDocument] = useState<ReportDocument | null>(null);
  const [savedTemplate, setSavedTemplate] = useState<ReportTemplateId | null>(null);
  const [reportState, setReportState] = useState<'none' | 'stale' | 'fresh'>('none');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Style tray opens with the preview so users can pick a layout, then drag it
  // down for a full-screen look at the PDF.
  const [stylesOpen, setStylesOpen] = useState(true);
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [photoMenuId, setPhotoMenuId] = useState<string | null>(null);
  const openedStylesOnce = useRef(false);

  const load = useCallback(async (options?: { openStyles?: boolean; silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setErrorMessage(null);
    try {
      const [doc, freshness, latest, preferences, pro, job] = await Promise.all([
        loadReportDocument(id),
        getReportFreshness(id),
        reportsRepository.getLatestReportForJob(id),
        getPreferences(),
        hasProAccess(),
        jobsRepository.getJob(id),
      ]);
      setDocument(doc);
      setReportState(freshness);
      setSavedTemplate(latest?.templateId ?? null);
      setTemplate(templateAllowedForTier(preferences.reportTemplate, pro));
      setPhotoLayout(normalizePhotoAnnotationLayout(preferences.photoAnnotationLayout));
      setIncludeReviewLink(preferences.includeReviewLink !== false);
      setCoverPhotoId(job?.coverPhotoId ?? null);
      if (options?.openStyles) setStylesOpen(true);
    } catch (error) {
      logger.error('Report preview failed', error);
      setDocument(null);
      setErrorMessage(
        error instanceof ReportGenerationError
          ? error.message
          : t('preview.errorFallback')
      );
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      // Open the style tray on the first visit; keep it closed when returning
      // from changing a photo, markup, or the cover.
      const firstVisit = !openedStylesOnce.current;
      if (firstVisit) openedStylesOnce.current = true;
      void load({ openStyles: firstVisit, silent: !firstVisit });
    }, [load])
  );

  const html = useMemo(
    () =>
      document
        ? buildReportPreviewHtml({
            ...document.htmlInput,
            template,
            photoAnnotationLayout: photoLayout,
          })
        : '',
    [document, template, photoLayout]
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

  const choosePhotoLayout = (key: string) => {
    const next = normalizePhotoAnnotationLayout(key);
    if (next === photoLayout) return;
    setPhotoLayout(next);
    void savePreferences({ photoAnnotationLayout: next });
  };

  const handleGenerate = async () => {
    const allowed = await canGenerateReportForJob(id);
    if (!allowed) {
      router.push({ pathname: '/paywall', params: { trigger: 'free_limit' } });
      return;
    }
    router.push(`/job/${id}/generate?template=${template}`);
  };

  const handlePreviewEdit = useCallback((event: ReportPreviewEditEvent) => {
    if (event.action === 'cover') {
      setStylesOpen(false);
      setCoverPickerOpen(true);
      return;
    }
    if (!event.photoId) return;
    if (event.action === 'annotate') {
      setStylesOpen(false);
      if (!isPro) {
        router.push({ pathname: '/paywall', params: { trigger: 'photo_markup' } });
        return;
      }
      router.push(`/job/${id}/annotate/${event.photoId}`);
      return;
    }
    setStylesOpen(false);
    setPhotoMenuId(event.photoId);
  }, [id, isPro]);

  const documentType = (summary?.documentType ?? 'reference') as DocumentType;
  const ctaLabel = (() => {
    if (documentType === 'quote') return t('preview.exportQuote');
    if (documentType === 'invoice') return t('preview.exportInvoice');
    if (reportState === 'none') return t('preview.createPdf');
    if (reportState === 'stale' || templateMismatch) return t('preview.updateReport');
    return t('preview.regenerateReport');
  })();

  const toggleReview = (enabled: boolean) => {
    setIncludeReviewLink(enabled);
    void savePreferences({ includeReviewLink: enabled }).then(() =>
      load({ openStyles: false, silent: true })
    );
  };

  const saveReview = (next: { url: string | null; provider: ReviewProvider }) => {
    void saveProfile({ reviewUrl: next.url, reviewProvider: next.provider }).then(() =>
      load({ openStyles: false, silent: true })
    );
  };

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
          onAction={() => void load({ openStyles: true })}
        />
      ) : (
        <View style={styles.body}>
          <View style={[styles.preview, { backgroundColor: colors.surfaceSunken }]}>
            <HtmlReportPreview html={html} onEdit={handlePreviewEdit} />
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

              <Text variant="caption" color={colors.textTertiary} style={{ marginBottom: spacing.sm, textAlign: 'center' }}>
                {t('preview.tapHint')}
              </Text>

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

              <View style={{ marginBottom: spacing.sm }}>
                <ReviewLinkSetting
                  enabled={includeReviewLink}
                  url={profile?.reviewUrl ?? null}
                  provider={profile?.reviewProvider ?? 'google'}
                  isPro={isPro}
                  onToggle={toggleReview}
                  onLocked={() => router.push({ pathname: '/paywall', params: { trigger: 'review_link' } })}
                  onSave={saveReview}
                />
              </View>

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
            <Text variant="bodyMedium" color={colors.textPrimary} style={{ marginTop: spacing.lg, marginBottom: spacing.xs }}>
              {t('preview.photoLayoutTitle')}
            </Text>
            <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
              {t('preview.photoLayoutDescription')}
            </Text>
            <SegmentedControl
              segments={[
                { key: 'fullWidth', label: t('photoAnnotate.layoutFullWidth') },
                { key: 'sideBySide', label: t('photoAnnotate.layoutCompact') },
              ]}
              value={photoLayout}
              onChange={choosePhotoLayout}
            />
            <View style={{ marginTop: spacing.lg }}>
              <ReviewLinkSetting
                enabled={includeReviewLink}
                url={profile?.reviewUrl ?? null}
                provider={profile?.reviewProvider ?? 'google'}
                isPro={isPro}
                onToggle={toggleReview}
                onLocked={() => router.push({ pathname: '/paywall', params: { trigger: 'review_link' } })}
                onSave={saveReview}
              />
            </View>
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <Button label={ctaLabel} onPress={handleGenerate} />
              <Button label={t('preview.done')} variant="secondary" onPress={() => setStylesOpen(false)} />
            </View>
          </BottomSheet>

          <CoverPickerSheet
            visible={coverPickerOpen}
            jobId={id}
            coverPhotoId={coverPhotoId}
            onClose={() => setCoverPickerOpen(false)}
            onChanged={() => {
              void load({ openStyles: false, silent: true });
            }}
          />

          <BottomSheetMenu
            visible={photoMenuId !== null}
            onClose={() => setPhotoMenuId(null)}
            items={
              photoMenuId
                ? [
                    {
                      icon: 'images-outline',
                      label: t('preview.changePhoto'),
                      onPress: () => router.push(`/job/${id}/photo/${photoMenuId}`),
                    },
                    {
                      icon: 'pencil',
                      label: t('preview.editMarkup'),
                      onPress: () => {
                        if (!isPro) {
                          router.push({ pathname: '/paywall', params: { trigger: 'photo_markup' } });
                          return;
                        }
                        router.push(`/job/${id}/annotate/${photoMenuId}`);
                      },
                    },
                  ]
                : []
            }
          />
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

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ErrorState,
  IconButton,
  LoadingState,
  NavigationHeader,
  Screen,
  useToast,
} from '@/components';
import { jobChecklistsRepository, jobsRepository, photosRepository, reportsRepository } from '@/database';
import { BottomSheetMenu } from '@/features/jobs/BottomSheetMenu';
import { CoverPickerSheet } from '@/features/reports/CoverPickerSheet';
import { HtmlReportPreview } from '@/features/reports/HtmlReportPreview';
import type { ReportPreviewEditEvent } from '@/features/reports/previewEdit';
import {
  businessInitialFromName,
  parseTrayAccent,
  PreviewStyleTray,
  type PreviewTrayTab,
} from '@/features/reports/PreviewStyleTray';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useWorkSummary } from '@/hooks/useWorkSummary';
import { useI18n } from '@/i18n/useI18n';
import {
  CoverDesignId,
  DEFAULT_COVER_DESIGN,
  DEFAULT_REPORT_SECTION_ORDER,
  DEFAULT_REPORT_SECTIONS,
  DEFAULT_REPORT_TEMPLATE,
  DocumentType,
  isFreeReportTemplate,
  isReportTemplateId,
  normalizeCoverDesignId,
  normalizePhotoAnnotationLayout,
  normalizeReportSectionOrder,
  normalizeReportSections,
  PhotoAnnotationLayout,
  ReportSectionId,
  ReportSections,
  ReportTemplateId,
  templateAllowedForTier,
  TemplateTradeFilter,
} from '@/models';
import { canGenerateReportForJob, hasProAccess } from '@/services/entitlementService';
import {
  buildReportPreviewHtml,
  getReportFreshness,
  loadReportDocument,
  ReportDocument,
  ReportGenerationError,
} from '@/services/pdfService';
import { getPreferences, savePreferences } from '@/services/preferencesService';
import { shareFile } from '@/services/shareService';
import { useTheme } from '@/theme';
import { DEFAULT_ACCENT } from '@/utils/accentColor';
import { logger } from '@/utils/logger';

function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default function ReportPreviewScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = paramId(params.id);
  const { colors } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { isPro } = useEntitlement();
  const { profile, save: saveProfile } = useBusinessProfile();
  const { summary } = useWorkSummary(id);

  const [template, setTemplate] = useState<ReportTemplateId>(DEFAULT_REPORT_TEMPLATE);
  const [pendingProTemplate, setPendingProTemplate] = useState<ReportTemplateId | null>(null);
  const [photoLayout, setPhotoLayout] = useState<PhotoAnnotationLayout>('fullWidth');
  const [coverDesign, setCoverDesign] = useState<CoverDesignId>(DEFAULT_COVER_DESIGN);
  const [accentOverride, setAccentOverride] = useState<string | null>(null);
  const [usingBrandColour, setUsingBrandColour] = useState(true);
  const [sections, setSections] = useState<ReportSections>({ ...DEFAULT_REPORT_SECTIONS });
  const [sectionOrder, setSectionOrder] = useState<ReportSectionId[]>([...DEFAULT_REPORT_SECTION_ORDER]);
  const [document, setDocument] = useState<ReportDocument | null>(null);
  const [savedTemplate, setSavedTemplate] = useState<ReportTemplateId | null>(null);
  const [latestPdfUri, setLatestPdfUri] = useState<string | null>(null);
  const [latestPdfName, setLatestPdfName] = useState<string | null>(null);
  const [reportState, setReportState] = useState<'none' | 'stale' | 'fresh'>('none');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [trayExpanded, setTrayExpanded] = useState(false);
  const [trayTab, setTrayTab] = useState<PreviewTrayTab>('templates');
  const [tradeFilter, setTradeFilter] = useState<TemplateTradeFilter>('all');
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [photoMenuId, setPhotoMenuId] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [checklistProgress, setChecklistProgress] = useState({ checked: 0, total: 0 });
  const openedTrayOnce = useRef(false);
  const loadGeneration = useRef(0);

  const brandAccent = parseTrayAccent(profile?.accentColor);
  const accentColor = accentOverride ?? brandAccent;

  const load = useCallback(async (options?: { expandTray?: boolean; silent?: boolean }) => {
    if (!id) {
      setDocument(null);
      setErrorMessage(t('preview.errorFallback'));
      setLoading(false);
      return;
    }
    const generation = ++loadGeneration.current;
    if (!options?.silent) setLoading(true);
    setErrorMessage(null);
    try {
      const loadWork = Promise.all([
        loadReportDocument(id, { useJobAddressOnly: true }),
        getReportFreshness(id),
        reportsRepository.getLatestReportForJob(id),
        getPreferences(),
        hasProAccess(),
        jobsRepository.getJob(id),
        photosRepository.listPhotos(id),
        jobChecklistsRepository.getChecklist(id),
      ]);
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new ReportGenerationError(t('preview.errorFallback'))), 45000);
      });
      const [doc, freshness, latest, preferences, pro, job, photos, checklist] = await Promise.race([
        loadWork,
        timeout,
      ]);
      if (generation !== loadGeneration.current) return;
      setDocument(doc);
      setReportState(freshness);
      setSavedTemplate(latest?.templateId ?? null);
      setLatestPdfUri(latest?.localPdfUri ?? null);
      setLatestPdfName(latest?.fileName ?? null);
      setTemplate(templateAllowedForTier(preferences.reportTemplate, pro));
      setPendingProTemplate(null);
      setPhotoLayout(normalizePhotoAnnotationLayout(preferences.photoAnnotationLayout));
      setCoverDesign(normalizeCoverDesignId(preferences.coverDesign));
      setSections(normalizeReportSections(preferences.reportSections));
      setSectionOrder(normalizeReportSectionOrder(preferences.reportSectionOrder));
      // Silent reloads (section toggles, colour saves) must keep the tray's accent
      // selection — wiping it made the preview jump back to the brand colour.
      if (!options?.silent) {
        setAccentOverride(null);
        setUsingBrandColour(true);
      }
      setCoverPhotoId(job?.coverPhotoId ?? null);
      setPhotoCount(photos.length);
      setChecklistProgress({
        checked: checklist?.items.filter((item) => item.checked).length ?? 0,
        total: checklist?.items.length ?? 0,
      });
      if (options?.expandTray) setTrayExpanded(true);
    } catch (error) {
      if (generation !== loadGeneration.current) return;
      logger.error('Report preview failed', error);
      setDocument(null);
      setErrorMessage(
        error instanceof ReportGenerationError ? error.message : t('preview.errorFallback')
      );
    } finally {
      if (generation === loadGeneration.current && !options?.silent) setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      const firstVisit = !openedTrayOnce.current;
      if (firstVisit) openedTrayOnce.current = true;
      void load({ expandTray: false, silent: !firstVisit });
    }, [load])
  );

  const previewTemplate = pendingProTemplate ?? template;

  const html = useMemo(() => {
    if (!document) return '';
    const gated = applyLocalSectionGates(document.htmlInput, sections, sectionOrder);
    return buildReportPreviewHtml({
      ...gated,
      template: previewTemplate,
      photoAnnotationLayout: photoLayout,
      coverDesign,
      reportSections: sections,
      reportSectionOrder: sectionOrder,
      business: {
        ...gated.business,
        accentColor: isPro ? accentColor : DEFAULT_ACCENT,
      },
    });
  }, [
    document,
    previewTemplate,
    photoLayout,
    coverDesign,
    sections,
    sectionOrder,
    accentColor,
    isPro,
  ]);

  const templateMismatch =
    reportState === 'fresh' && savedTemplate !== null && savedTemplate !== template;

  const chooseTemplate = (key: ReportTemplateId) => {
    if (!isReportTemplateId(key)) return;
    if (!isPro && !isFreeReportTemplate(key)) {
      setPendingProTemplate(key);
      return;
    }
    setPendingProTemplate(null);
    if (key === template) return;
    setTemplate(key);
    void savePreferences({ reportTemplate: key });
  };

  const handleGenerate = async () => {
    if (pendingProTemplate) {
      router.push({ pathname: '/paywall', params: { trigger: 'template' } });
      return;
    }
    const allowed = await canGenerateReportForJob(id);
    if (!allowed) {
      router.push({ pathname: '/paywall', params: { trigger: 'free_limit' } });
      return;
    }
    router.push(`/job/${id}/generate?template=${template}`);
  };

  const handleShare = async () => {
    // Template mismatch still means the on-disk PDF is outdated even when the
    // content hash matches — regenerate instead of sharing the old layout.
    if (reportState === 'fresh' && !templateMismatch && latestPdfUri) {
      try {
        const shared = await shareFile(latestPdfUri, latestPdfName ?? undefined);
        if (!shared) showToast({ message: t('reports.toastShareError'), tone: 'destructive' });
      } catch {
        showToast({ message: t('reports.toastShareError'), tone: 'destructive' });
      }
      return;
    }
    await handleGenerate();
  };

  const handlePreviewEdit = useCallback(
    (event: ReportPreviewEditEvent) => {
      if (event.action === 'cover') {
        setTrayExpanded(false);
        setCoverPickerOpen(true);
        return;
      }
      if (!event.photoId) return;
      if (event.action === 'annotate') {
        setTrayExpanded(false);
        if (!isPro) {
          router.push({ pathname: '/paywall', params: { trigger: 'photo_markup' } });
          return;
        }
        router.push(`/job/${id}/annotate/${event.photoId}`);
        return;
      }
      setTrayExpanded(false);
      setPhotoMenuId(event.photoId);
    },
    [id, isPro]
  );

  const documentType = (summary?.documentType ?? 'reference') as DocumentType;
  const ctaLabel = (() => {
    if (documentType === 'quote') return t('preview.exportQuote');
    if (documentType === 'invoice') return t('preview.exportInvoice');
    if (reportState === 'none') return t('preview.createPdf');
    if (reportState === 'stale' || templateMismatch) return t('preview.updateReport');
    return t('preview.regenerateReport');
  })();

  const persistSections = (next: ReportSections) => {
    setSections(next);
    void savePreferences({
      reportSections: next,
      includeReviewLink: next.review,
    }).then(() => load({ silent: true }));
  };

  const toggleSection = (sectionId: ReportSectionId, value: boolean) => {
    const next = { ...sections, [sectionId]: value };
    persistSections(next);
    if (sectionId === 'checklist') {
      void jobChecklistsRepository.setIncludeInPdf(id, value).catch(() => undefined);
    }
  };

  const moveSection = (sectionId: ReportSectionId, direction: -1 | 1) => {
    const index = sectionOrder.indexOf(sectionId);
    const swapWith = index + direction;
    if (index < 0 || swapWith < 0 || swapWith >= sectionOrder.length) return;
    const next = [...sectionOrder];
    const current = next[index]!;
    next[index] = next[swapWith]!;
    next[swapWith] = current;
    setSectionOrder(next);
    void savePreferences({ reportSectionOrder: next }).then(() => load({ silent: true }));
  };

  const chooseCoverDesign = (design: CoverDesignId) => {
    setCoverDesign(design);
    void savePreferences({ coverDesign: design }).then(() => load({ silent: true }));
  };

  const applyBrandColour = () => {
    setUsingBrandColour(true);
    setAccentOverride(null);
    void load({ silent: true });
  };

  const applyAccentSwatch = (hex: string) => {
    setUsingBrandColour(false);
    setAccentOverride(hex);
    void saveProfile({ accentColor: hex }).then(() => load({ silent: true }));
  };

  const openCustomAccent = () => {
    router.push('/settings/branding');
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
              onPress={() => {
                setTrayTab('colour');
                setTrayExpanded(true);
              }}
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
          onAction={() => void load({ expandTray: false })}
        />
      ) : (
        <View style={styles.body}>
          <View style={[styles.preview, { backgroundColor: colors.surfaceSunken }]}>
            <HtmlReportPreview html={html} onEdit={handlePreviewEdit} />
          </View>

          <PreviewStyleTray
            expanded={trayExpanded}
            onExpand={() => setTrayExpanded(true)}
            onCollapse={() => setTrayExpanded(false)}
            tab={trayTab}
            onTabChange={setTrayTab}
            template={template}
            pendingProTemplate={pendingProTemplate}
            onSelectTemplate={chooseTemplate}
            onUnlockPro={() => router.push({ pathname: '/paywall', params: { trigger: 'template' } })}
            onColourLocked={() => router.push({ pathname: '/paywall', params: { trigger: 'colour' } })}
            onReviewLocked={() => router.push({ pathname: '/paywall', params: { trigger: 'review_link' } })}
            onUseFreeLayout={() => {
              setPendingProTemplate(null);
              if (!isFreeReportTemplate(template)) {
                setTemplate(DEFAULT_REPORT_TEMPLATE);
                void savePreferences({ reportTemplate: DEFAULT_REPORT_TEMPLATE });
              }
            }}
            isPro={isPro}
            coverDesign={coverDesign}
            onCoverDesign={chooseCoverDesign}
            accentColor={accentColor}
            usingBrandColour={usingBrandColour}
            onBrandColour={applyBrandColour}
            onAccentSwatch={applyAccentSwatch}
            onCustomAccent={openCustomAccent}
            sections={sections}
            sectionOrder={sectionOrder}
            onToggleSection={toggleSection}
            onMoveSection={moveSection}
            sectionMeta={{
              photoCount,
              checklistChecked: checklistProgress.checked,
              checklistTotal: checklistProgress.total,
              reviewProvider: profile?.reviewProvider ?? 'google',
              hasReviewUrl: Boolean(profile?.reviewUrl?.trim()),
              businessInitial: businessInitialFromName(profile?.businessName),
            }}
            ctaLabel={ctaLabel}
            onCreatePdf={() => void handleGenerate()}
            onShare={() => void handleShare()}
            tradeFilter={tradeFilter}
            onTradeFilter={setTradeFilter}
          />

          <CoverPickerSheet
            visible={coverPickerOpen}
            jobId={id}
            coverPhotoId={coverPhotoId}
            onClose={() => setCoverPickerOpen(false)}
            onChanged={() => {
              void load({ silent: true });
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

/** Live preview gates without waiting for a full document reload. */
function applyLocalSectionGates(
  input: ReportDocument['htmlInput'],
  sections: ReportSections,
  order: ReportSectionId[]
): ReportDocument['htmlInput'] {
  return {
    ...input,
    before: sections.photos ? input.before : [],
    during: sections.photos ? input.during : [],
    after: sections.photos ? input.after : [],
    areas: sections.photos ? input.areas : undefined,
    coverDataUri: sections.cover ? input.coverDataUri : null,
    brandCoverDataUri: sections.cover ? input.brandCoverDataUri : undefined,
    brandThanksDataUri: sections.cover ? input.brandThanksDataUri : undefined,
    checklist: sections.checklist ? input.checklist : null,
    materials: sections.costs ? input.materials : null,
    pricing: sections.costs ? input.pricing : null,
    signature: sections.signature ? input.signature : null,
    review: sections.review ? input.review : null,
    reportSections: sections,
    reportSectionOrder: order,
  };
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  preview: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
});

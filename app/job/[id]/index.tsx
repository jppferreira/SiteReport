import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';

import {
  ConfirmationDialog,
  ErrorState,
  IconButton,
  LoadingState,
  NavigationHeader,
  Screen,
  useToast,
} from '@/components';
import { jobChecklistsRepository, jobsRepository, photoAreasRepository, photosRepository } from '@/database';
import { BottomSheetMenu } from '@/features/jobs/BottomSheetMenu';
import {
  addressForMeta,
  computeGuidedChecklist,
  ctaForGuidedState,
  GuidedFooter,
  GuidedJobHeader,
  GuidedStepList,
  JobDetailsSheet,
  ReportReadyView,
  type GuidedStepId,
  type ReportReadyStat,
} from '@/features/jobs/guidedChecklist';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useJob } from '@/hooks/useJob';
import { useSignature } from '@/hooks/useSignature';
import { useWorkSummary } from '@/hooks/useWorkSummary';
import { useI18n } from '@/i18n/useI18n';
import { formatPence, JobChecklist, linesForReport, pricingTotalPence } from '@/models';
import { deleteJobFiles } from '@/services/fileService';
import { reportTemplateLabel } from '@/services/pdfService';
import { useTheme } from '@/theme';
import { formatDate, formatDateShort } from '@/utils/format';
import { goBack } from '@/utils/goBack';

export default function JobOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { spacing } = useTheme();
  const { t } = useI18n();
  const { isPro, refresh: refreshEntitlement } = useEntitlement();
  const { job, progress, loading, error, refresh } = useJob(id);
  const { summary, refresh: refreshSummary } = useWorkSummary(id);
  const { signature, refresh: refreshSignature } = useSignature(id);
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoCounts, setPhotoCounts] = useState({ before: 0, during: 0, after: 0 });
  const [photoThumbs, setPhotoThumbs] = useState<string[]>([]);
  const [photoCaptions, setPhotoCaptions] = useState<string[]>([]);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<JobChecklist | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
      void refreshSummary();
      void refreshSignature();
      photosRepository.countPhotos(id).then(setPhotoCounts);
      photosRepository.listPhotos(id).then((photos) => {
        setPhotoThumbs(
          photos
            .slice(0, 8)
            .map((p) => p.thumbnailUri || p.localUri)
            .filter(Boolean)
        );
        setPhotoCaptions(photos.map((p) => p.caption ?? '').filter(Boolean));
      });
      photoAreasRepository.listAreas(id).then((areas) => {
        setAreaName(areas[0]?.name ?? null);
      });
      jobChecklistsRepository.getChecklist(id).then(setChecklist);
    }, [refresh, refreshSummary, refreshSignature, id])
  );

  const guided = useMemo(() => {
    if (!job) return null;
    return computeGuidedChecklist({
      job,
      photoCounts,
      photoCaptions,
      areaName,
      summary,
      hasSignature: Boolean(signature),
      signatureName: signature?.customerName ?? null,
      signatureDate: signature?.signedAt ?? null,
      checklist,
      isPro,
    });
  }, [job, photoCounts, photoCaptions, areaName, summary, signature, checklist, isPro]);

  if (loading && !job) {
    return (
      <Screen>
        <NavigationHeader title={t('jobDetail.title')} onBack={() => goBack('/(tabs)/jobs')} />
        <LoadingState />
      </Screen>
    );
  }

  if (error || !job || !progress || !guided) {
    return (
      <Screen>
        <NavigationHeader title={t('jobDetail.title')} onBack={() => goBack('/(tabs)/jobs')} />
        <ErrorState title={t('jobDetail.notFound')} description={error ?? undefined} onAction={refresh} />
      </Screen>
    );
  }

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await jobsRepository.deleteJob(job.id);
      await deleteJobFiles(job.id);
      showToast({ message: t('jobDetail.toastDeleted'), tone: 'neutral' });
      router.replace('/(tabs)/jobs');
    } finally {
      setDeleting(false);
    }
  };

  const openPhotosTools = () => {
    router.push(`/job/${job.id}/photos/tools`);
  };

  const openStep = async (stepId: GuidedStepId) => {
    switch (stepId) {
      case 'details':
        setDetailsSheetOpen(true);
        return;
      case 'photos':
        openPhotosTools();
        return;
      case 'measure':
        router.push(`/job/${job.id}/measure`);
        return;
      case 'level':
        router.push(`/job/${job.id}/measure?mode=level`);
        return;
      case 'notes':
        router.push(`/job/${job.id}/summary`);
        return;
      case 'checklist': {
        let entitled = isPro;
        if (!entitled) {
          const next = await refreshEntitlement();
          entitled = next.status === 'pro';
        }
        if (!entitled) {
          router.push({ pathname: '/paywall', params: { trigger: 'checklist' } });
          return;
        }
        router.push(`/job/${job.id}/checklist`);
        return;
      }
      case 'signature':
        router.push(`/job/${job.id}/signature`);
        return;
      default:
        return;
    }
  };

  const cta = ctaForGuidedState(guided);
  const primaryLabel = labelForCta(t, cta.stepId, cta.kind, photoCounts);
  const primaryIcon =
    cta.kind === 'create'
      ? ('document-text-outline' as const)
      : cta.stepId === 'photos'
        ? ('camera-outline' as const)
        : undefined;

  const intro = introForState(t, guided, photoCounts);
  const showReady = guided.allComplete;
  const metaAddress = addressForMeta(job.address);
  const dateLabel = formatDateShort(job.jobDate);

  const onPrimary = () => {
    if (cta.stepId === 'report') {
      router.push(`/job/${job.id}/preview`);
      return;
    }
    void openStep(cta.stepId);
  };

  const readyStats = buildReadyStats(t, guided, photoCounts, summary, checklist, signature);

  return (
    <Screen>
      <NavigationHeader
        title=""
        onBack={() => goBack('/(tabs)/jobs')}
        right={
          showReady ? (
            <IconButton
              name="share-outline"
              size={20}
              accessibilityLabel={t('jobDetail.guided.sendToCustomer')}
              onPress={() => router.push(`/job/${job.id}/send`)}
              style={{ width: 40, height: 40 }}
            />
          ) : (
            <IconButton
              name="ellipsis-horizontal"
              size={20}
              accessibilityLabel={t('jobDetail.moreOptionsA11y')}
              onPress={() => setMenuOpen(true)}
              style={{ width: 40, height: 40 }}
            />
          )
        }
      />

      {showReady ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexGrow: 1 }}
        >
          <ReportReadyView
            jobTitle={job.title}
            customerName={job.customerName}
            stats={readyStats}
            templateName={reportTemplateLabel('modern')}
            templateMeta={t('jobDetail.guided.templateMeta', { pages: 6 })}
            templateFree
            onChangeTemplate={() => router.push(`/job/${job.id}/generate`)}
            onCreatePdf={() => router.push(`/job/${job.id}/preview`)}
            onSend={() => router.push(`/job/${job.id}/send`)}
          />
        </ScrollView>
      ) : (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 4,
              paddingBottom: spacing.xl,
              gap: 14,
            }}
          >
            <GuidedJobHeader
              title={job.title}
              address={metaAddress}
              dateLabel={dateLabel}
              completed={guided.completedCount}
              total={guided.totalCount}
              intro={intro}
            />
            <GuidedStepList
              steps={guided.steps}
              currentId={guided.currentId}
              isPro={isPro}
              photoCounts={photoCounts}
              photoThumbs={photoThumbs}
              showYourStepsLabel={guided.completedCount === 0}
              onPressStep={(stepId) => void openStep(stepId)}
              onAddAfterPhotos={openPhotosTools}
              onMeasure={() => router.push(`/job/${job.id}/measure`)}
            />
          </ScrollView>

          <GuidedFooter
            primaryLabel={primaryLabel}
            primaryIcon={primaryIcon}
            onPrimary={onPrimary}
            showSavedNote={guided.completedCount === 0}
            onSavedNotePress={() => router.push('/settings/data')}
            showPreviewRow={guided.completedCount > 0}
            unlockHint={
              guided.canCreatePdf
                ? null
                : photoCounts.after === 0 && photoCounts.before + photoCounts.during > 0
                  ? t('jobDetail.guided.unlockAfterPhotos')
                  : t('jobDetail.guided.unlockRequired')
            }
            canCreatePdf={guided.canCreatePdf}
            onPreview={() => router.push(`/job/${job.id}/preview`)}
          />
        </>
      )}

      <JobDetailsSheet
        visible={detailsSheetOpen}
        job={job}
        onClose={() => setDetailsSheetOpen(false)}
        onSavedContinue={() => {
          setDetailsSheetOpen(false);
          void refresh();
          openPhotosTools();
        }}
        onChangeTemplate={() => {
          setDetailsSheetOpen(false);
          router.push(`/job/${job.id}/generate`);
        }}
      />

      <BottomSheetMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={[
          {
            icon: 'create-outline',
            label: t('jobDetail.editDetails'),
            onPress: () => setDetailsSheetOpen(true),
          },
          {
            icon: 'trash-outline',
            label: t('jobDetail.deleteJob'),
            destructive: true,
            onPress: () => setConfirmDelete(true),
          },
        ]}
      />

      <ConfirmationDialog
        visible={confirmDelete}
        title={t('jobDetail.deleteConfirmTitle')}
        description={t('jobDetail.deleteConfirmDescription')}
        confirmLabel={t('jobDetail.deleteConfirmLabel')}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        loading={deleting}
      />
    </Screen>
  );
}

type Translate = (key: string, options?: Record<string, string | number>) => string;

function introForState(
  t: Translate,
  guided: NonNullable<ReturnType<typeof computeGuidedChecklist>>,
  photoCounts: { before: number; during: number; after: number }
): string | null {
  if (guided.canCreatePdf) return t('jobDetail.guided.introReady');
  if (guided.completedCount === 0) return t('jobDetail.guided.introFirst');
  if (photoCounts.before + photoCounts.during > 0 && photoCounts.after === 0) {
    return t('jobDetail.guided.introAfterPhotos');
  }
  return t('jobDetail.guided.introKeepGoing');
}

function labelForCta(
  t: Translate,
  stepId: GuidedStepId | 'report',
  kind: 'start' | 'continue' | 'create',
  photoCounts: { before: number; during: number; after: number }
): string {
  if (kind === 'create' || stepId === 'report') return t('jobDetail.guided.ctaCreatePdf');
  if (kind === 'start' && stepId === 'details') return t('jobDetail.guided.ctaStartDetails');
  if (stepId === 'photos' && photoCounts.after === 0 && photoCounts.before + photoCounts.during > 0) {
    return t('jobDetail.guided.ctaContinueAfter');
  }
  switch (stepId) {
    case 'details':
      return t('jobDetail.guided.ctaContinueDetails');
    case 'photos':
      return t('jobDetail.guided.ctaContinuePhotos');
    case 'measure':
      return t('jobDetail.guided.ctaContinueMeasure');
    case 'level':
      return t('jobDetail.guided.ctaContinueLevel');
    case 'notes':
      return t('jobDetail.guided.ctaContinueNotes');
    case 'checklist':
      return t('jobDetail.guided.ctaContinueChecklist');
    case 'signature':
      return t('jobDetail.guided.ctaContinueSignature');
    default:
      return t('common.continue');
  }
}

function buildReadyStats(
  t: Translate,
  guided: NonNullable<ReturnType<typeof computeGuidedChecklist>>,
  photoCounts: { before: number; during: number; after: number },
  summary: ReturnType<typeof useWorkSummary>['summary'],
  checklist: JobChecklist | null,
  signature: ReturnType<typeof useSignature>['signature']
): ReportReadyStat[] {
  const photoTotal = photoCounts.before + photoCounts.during + photoCounts.after;
  const cost = summary ? pricingTotalPence(linesForReport(summary.pricing)) : null;
  const checklistStep = guided.steps.find((s) => s.id === 'checklist');
  const checklistChip = checklistStep?.summaryChips[0]?.label;
  const levelChip = guided.steps.find((s) => s.id === 'level')?.summaryChips[0]?.label;

  const stats: ReportReadyStat[] = [
    {
      id: 'photos',
      title: t('jobDetail.guided.stats.photos', { count: photoTotal }),
      subtitle: t('jobDetail.guided.stats.photosSub'),
    },
    {
      id: 'measure',
      title: t('jobDetail.guided.stats.measure', { count: Math.max(photoCounts.during, 0) }),
      subtitle: t('jobDetail.guided.stats.measureSub'),
    },
    {
      id: 'level',
      title: levelChip
        ? t('jobDetail.guided.levelDegrees', { degrees: levelChip })
        : t('jobDetail.guided.stats.level'),
      subtitle: t('jobDetail.guided.stats.levelSub'),
    },
    {
      id: 'checklist',
      title: checklistChip
        ? t('jobDetail.guided.stats.checklist', {
            checked: checklistChip.split('/')[0] ?? 0,
            total: checklistChip.split('/')[1] ?? 0,
          })
        : t('jobDetail.guided.steps.checklist.title'),
      subtitle: checklist ? t('jobDetail.guided.stats.checklistSub') : t('jobDetail.guided.optional'),
    },
    {
      id: 'notes',
      title: t('jobDetail.guided.stats.notes'),
      subtitle:
        cost !== null
          ? t('jobDetail.guided.stats.notesSub', { cost: formatPence(cost) })
          : t('jobDetail.guided.stats.notesSubEmpty'),
    },
    {
      id: 'signature',
      title: t('jobDetail.guided.stats.signed'),
      subtitle: t('jobDetail.guided.stats.signedSub', {
        date: formatDate(signature?.signedAt ?? undefined),
      }),
    },
  ];
  return stats;
}

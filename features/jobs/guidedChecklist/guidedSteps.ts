import {
  Job,
  JobChecklist,
  JobSectionStatus,
  checklistProgress,
  formatPence,
  linesForReport,
  pricingTotalPence,
  WorkSummary,
} from '@/models';

export type GuidedStepId =
  | 'details'
  | 'photos'
  | 'measure'
  | 'level'
  | 'notes'
  | 'checklist'
  | 'signature';

export type GuidedRequirement = 'required' | 'optional' | 'recommended';

export type GuidedStepBadge = 'ar' | 'voice' | 'pro';

export type GuidedChip = {
  id: string;
  label: string;
  done?: boolean;
};

export type GuidedStep = {
  id: GuidedStepId;
  status: JobSectionStatus;
  requirement: GuidedRequirement;
  badge?: GuidedStepBadge;
  /** Compact summary chips when the step is done. */
  summaryChips: GuidedChip[];
  /** Expanded chips for the current/incomplete details card. */
  detailChips?: GuidedChip[];
  /** Photos step status line inputs for i18n in the view. */
  photosMeta?: { area: string | null; count: number; afterMissing: boolean };
};

export type GuidedChecklistState = {
  steps: GuidedStep[];
  completedCount: number;
  totalCount: number;
  /** First incomplete step — expanded as "current". */
  currentId: GuidedStepId | null;
  requiredComplete: boolean;
  allComplete: boolean;
  canCreatePdf: boolean;
};

export type GuidedChecklistInput = {
  job: Job;
  photoCounts: { before: number; during: number; after: number };
  photoCaptions?: string[];
  areaName?: string | null;
  summary: WorkSummary | null;
  hasSignature: boolean;
  signatureName?: string | null;
  signatureDate?: string | null;
  checklist: JobChecklist | null;
  isPro: boolean;
};

const ORDER: GuidedStepId[] = [
  'details',
  'photos',
  'measure',
  'level',
  'notes',
  'checklist',
  'signature',
];

const REQUIREMENT: Record<GuidedStepId, GuidedRequirement> = {
  details: 'required',
  photos: 'recommended',
  measure: 'optional',
  level: 'optional',
  notes: 'recommended',
  checklist: 'optional',
  signature: 'optional',
};

const BADGE: Partial<Record<GuidedStepId, GuidedStepBadge>> = {
  measure: 'ar',
  notes: 'voice',
  checklist: 'pro',
};

export const GUIDED_DURATION_KEY: Record<GuidedStepId, string> = {
  details: 'jobDetail.guided.durationDetails',
  photos: 'jobDetail.guided.durationPhotos',
  measure: 'jobDetail.guided.durationMeasure',
  level: 'jobDetail.guided.durationLevel',
  notes: 'jobDetail.guided.durationNotes',
  checklist: 'jobDetail.guided.durationChecklist',
  signature: 'jobDetail.guided.durationSignature',
};

function detailsStatus(job: Job): JobSectionStatus {
  if (!job.title.trim()) return 'not_started';
  if (job.customerName?.trim()) return 'complete';
  return 'in_progress';
}

function photosStatus(counts: GuidedChecklistInput['photoCounts']): JobSectionStatus {
  const total = counts.before + counts.during + counts.after;
  if (counts.before > 0 && counts.after > 0) return 'complete';
  if (total > 0) return 'in_progress';
  return 'not_started';
}

function measureStatus(counts: GuidedChecklistInput['photoCounts']): JobSectionStatus {
  return counts.during > 0 ? 'complete' : 'not_started';
}

function levelStatus(captions: string[] | undefined): JobSectionStatus {
  if (!captions?.length) return 'not_started';
  const hit = captions.some((c) => /level|°|deg\b/i.test(c));
  return hit ? 'complete' : 'not_started';
}

function notesStatus(summary: WorkSummary | null): JobSectionStatus {
  if (summary?.workCompleted?.trim()) return 'complete';
  if (summary && linesForReport(summary.pricing).length > 0) return 'in_progress';
  return 'not_started';
}

function checklistStatus(list: JobChecklist | null): JobSectionStatus {
  if (!list || list.items.length === 0) return 'not_started';
  const progress = checklistProgress(list.items);
  if (progress.checked === 0) return 'not_started';
  if (progress.checked >= progress.total) return 'complete';
  return 'in_progress';
}

function shortAddress(address: string | null): string | null {
  if (!address?.trim()) return null;
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return address.trim();
  return parts.slice(0, 2).join(', ');
}

export function addressForMeta(address: string | null): string | null {
  return shortAddress(address);
}

export function computeGuidedChecklist(input: GuidedChecklistInput): GuidedChecklistState {
  const { job, photoCounts, summary, checklist, isPro } = input;
  const photoTotal = photoCounts.before + photoCounts.during + photoCounts.after;

  const statuses: Record<GuidedStepId, JobSectionStatus> = {
    details: detailsStatus(job),
    photos: photosStatus(photoCounts),
    measure: measureStatus(photoCounts),
    level: levelStatus(input.photoCaptions),
    notes: notesStatus(summary),
    checklist: isPro ? checklistStatus(checklist) : checklistStatus(checklist),
    signature: input.hasSignature ? 'complete' : 'not_started',
  };

  const steps: GuidedStep[] = ORDER.map((id) => {
    const status = statuses[id];
    const summaryChips: GuidedChip[] = [];
    let detailChips: GuidedChip[] | undefined;
    let photosMeta: GuidedStep['photosMeta'];

    if (id === 'details') {
      detailChips = [
        { id: 'title', label: '', done: Boolean(job.title.trim()) },
        { id: 'customer', label: '', done: Boolean(job.customerName?.trim()) },
        { id: 'trade', label: '', done: false },
      ];
      if (status === 'complete' || status === 'in_progress') {
        if (job.customerName?.trim()) {
          summaryChips.push({ id: 'customer', label: job.customerName.trim(), done: true });
        }
      }
    }

    if (id === 'photos' && (status === 'in_progress' || status === 'complete')) {
      photosMeta = {
        area: input.areaName?.trim() || null,
        count: photoTotal,
        afterMissing: photoCounts.after === 0 && photoTotal > 0,
      };
    }

    if (id === 'measure' && status === 'complete') {
      summaryChips.push({
        id: 'count',
        label: String(photoCounts.during),
        done: true,
      });
    }

    if (id === 'level' && status === 'complete') {
      const caption = input.photoCaptions?.find((c) => /level|°/i.test(c));
      const match = caption?.match(/(-?\d+(?:\.\d+)?)\s*°/);
      summaryChips.push({
        id: 'level',
        label: match?.[1] ?? '',
        done: true,
      });
    }

    if (id === 'notes') {
      if (status === 'complete' || status === 'in_progress') {
        const total = summary ? pricingTotalPence(linesForReport(summary.pricing)) : null;
        if (total !== null) {
          summaryChips.push({ id: 'cost', label: formatPence(total), done: true });
        }
      }
    }

    if (id === 'checklist' && checklist && status !== 'not_started') {
      const progress = checklistProgress(checklist.items);
      summaryChips.push({
        id: 'progress',
        label: `${progress.checked}/${progress.total}`,
        done: status === 'complete',
      });
    }

    if (id === 'signature' && input.hasSignature) {
      const name = input.signatureName?.trim();
      if (name) summaryChips.push({ id: 'name', label: name, done: true });
    }

    return {
      id,
      status,
      requirement: REQUIREMENT[id],
      badge: BADGE[id],
      summaryChips,
      detailChips,
      photosMeta,
    };
  });

  const completedCount = steps.filter((s) => s.status === 'complete').length;
  const currentId = steps.find((s) => s.status !== 'complete')?.id ?? null;
  const requiredComplete = statuses.details === 'complete' || Boolean(job.title.trim());
  // Report PDF is available as soon as the job has a title — photos, measure,
  // checklist and signature stay optional add-ons, not gates.
  const canCreatePdf = Boolean(job.title.trim());

  return {
    steps,
    completedCount,
    totalCount: ORDER.length,
    currentId,
    requiredComplete,
    allComplete: completedCount === ORDER.length,
    canCreatePdf,
  };
}

export function ctaForGuidedState(state: GuidedChecklistState): {
  stepId: GuidedStepId | 'report';
  kind: 'start' | 'continue' | 'create';
} {
  if (state.canCreatePdf) {
    return { stepId: 'report', kind: 'create' };
  }
  const id = state.currentId ?? 'details';
  const kind = state.completedCount === 0 && id === 'details' ? 'start' : 'continue';
  return { stepId: id, kind };
}

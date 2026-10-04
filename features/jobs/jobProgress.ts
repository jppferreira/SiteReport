import { Job, JobProgress, JobSectionKey, JobSectionStatus, JobStatus } from '@/models';

export type JobProgressInput = {
  job: Pick<Job, 'title'>;
  photoCounts: { before: number; after: number };
  hasWorkSummary: boolean;
  hasSignature: boolean;
  reportState: 'none' | 'stale' | 'fresh';
};

const SECTION_ORDER: JobSectionKey[] = ['details', 'photos', 'summary', 'signature', 'report'];

/**
 * Pure function describing the five-section workspace progress shown on the
 * job overview screen. Kept free of persistence/IO so it can be unit tested
 * directly against representative input combinations.
 */
export function computeJobProgress(input: JobProgressInput): JobProgress {
  const detailsStatus: JobSectionStatus = input.job.title.trim().length > 0 ? 'complete' : 'not_started';

  const totalPhotos = input.photoCounts.before + input.photoCounts.after;
  let photosStatus: JobSectionStatus = 'not_started';
  if (input.photoCounts.before > 0 && input.photoCounts.after > 0) {
    photosStatus = 'complete';
  } else if (totalPhotos > 0) {
    photosStatus = 'in_progress';
  }

  const summaryStatus: JobSectionStatus = input.hasWorkSummary ? 'complete' : 'not_started';
  const signatureStatus: JobSectionStatus = input.hasSignature ? 'complete' : 'not_started';

  let reportStatus: JobSectionStatus = 'not_started';
  if (input.reportState === 'fresh') reportStatus = 'complete';
  else if (input.reportState === 'stale') reportStatus = 'in_progress';

  const sections: Record<JobSectionKey, JobSectionStatus> = {
    details: detailsStatus,
    photos: photosStatus,
    summary: summaryStatus,
    signature: signatureStatus,
    report: reportStatus,
  };

  const completedCount = SECTION_ORDER.filter((key) => sections[key] === 'complete').length;

  return {
    sections,
    completedCount,
    totalCount: SECTION_ORDER.length,
  };
}

/** Returns the next best action for the job overview primary CTA. */
export function nextRecommendedAction(progress: JobProgress): {
  label: string;
  target: JobSectionKey;
} {
  if (progress.sections.photos !== 'complete') {
    return { label: 'Add photos', target: 'photos' };
  }
  if (progress.sections.summary !== 'complete') {
    return { label: 'Continue report', target: 'summary' };
  }
  if (progress.sections.signature === 'not_started') {
    return { label: 'Add sign-off', target: 'signature' };
  }
  return { label: 'Preview report', target: 'report' };
}

/**
 * Derives the job's persisted status from its workspace progress. A report
 * must exist and be up to date for a job to count as complete; otherwise a
 * job with any progress at all is "in progress".
 */
export function deriveJobStatus(progress: JobProgress): JobStatus {
  if (progress.sections.report === 'complete') return 'complete';
  const hasAnyProgress =
    progress.sections.photos !== 'not_started' ||
    progress.sections.summary !== 'not_started' ||
    progress.sections.signature !== 'not_started' ||
    progress.sections.report !== 'not_started';
  return hasAnyProgress ? 'in_progress' : 'draft';
}

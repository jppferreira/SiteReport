import { useCallback, useEffect, useState } from 'react';

import { jobsRepository, photosRepository, signatureRepository, workSummaryRepository } from '@/database';
import { computeJobProgress, deriveJobStatus } from '@/features/jobs/jobProgress';
import { Job, JobProgress } from '@/models';
import { getReportFreshness } from '@/services/pdfService';
import { logger } from '@/utils/logger';

export function useJob(jobId: string | undefined) {
  const [job, setJob] = useState<Job | null>(null);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const [loadedJob, photoCounts, summary, signature, reportState] = await Promise.all([
        jobsRepository.getJob(jobId),
        photosRepository.countPhotos(jobId),
        workSummaryRepository.getWorkSummary(jobId),
        signatureRepository.getSignature(jobId),
        getReportFreshness(jobId),
      ]);

      if (!loadedJob) {
        setJob(null);
        setError('This job could not be found.');
        return;
      }

      const hasWorkSummary = Boolean(summary?.workCompleted && summary.workCompleted.trim().length > 0);
      const nextProgress = computeJobProgress({
        job: loadedJob,
        photoCounts,
        hasWorkSummary,
        hasSignature: Boolean(signature),
        reportState,
      });

      const nextStatus = deriveJobStatus(nextProgress);
      if (nextStatus !== loadedJob.status) {
        await jobsRepository.updateJob(jobId, { status: nextStatus });
        loadedJob.status = nextStatus;
      }

      setJob(loadedJob);
      setProgress(nextProgress);
    } catch (err) {
      logger.error('Failed to load job', err);
      setError("We couldn't load this job. Try again.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { job, progress, loading, error, refresh };
}

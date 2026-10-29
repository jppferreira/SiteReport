import { useCallback, useEffect, useState } from 'react';

import { jobsRepository, photosRepository, reportsRepository } from '@/database';
import { Job, Report } from '@/models';
import { getReportFreshness } from '@/services/pdfService';
import { logger } from '@/utils/logger';

export type ReportWithJob = { report: Report; job: Job | null; isStale: boolean; coverUri: string | null };

export function useReports() {
  const [items, setItems] = useState<ReportWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const reports = await reportsRepository.listAllReports();
      const latestPerJob = new Map<string, Report>();
      for (const report of reports) {
        if (!latestPerJob.has(report.jobId)) {
          latestPerJob.set(report.jobId, report);
        }
      }

      const jobIds = Array.from(latestPerJob.keys());
      const [covers, results] = await Promise.all([
        photosRepository.getJobCoverUris(jobIds),
        Promise.all(
          Array.from(latestPerJob.values()).map(async (report) => {
            const [job, freshness] = await Promise.all([
              jobsRepository.getJob(report.jobId),
              getReportFreshness(report.jobId),
            ]);
            return { report, job, isStale: freshness === 'stale' };
          })
        ),
      ]);

      const withCovers = results.map((item) => ({
        ...item,
        coverUri: covers[item.report.jobId] ?? null,
      }));

      withCovers.sort((a, b) => (a.report.generatedAt < b.report.generatedAt ? 1 : -1));
      setItems(withCovers);
    } catch (err) {
      logger.error('Failed to load reports', err);
      setError("We couldn't load your reports. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch on mount; `refresh` manages its own loading/error state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}

export function useJobReports(jobId: string) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await reportsRepository.listReportsForJob(jobId);
      setReports(result);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    // Fetch on mount; `refresh` manages its own loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { reports, loading, refresh };
}

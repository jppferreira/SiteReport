import { useCallback, useEffect, useMemo, useState } from 'react';

import { jobsRepository, photosRepository, reportsRepository } from '@/database';
import { ReportsFilter, selectReports } from '@/features/reports/filterReports';
import { Job, Report } from '@/models';
import { getReportFreshness } from '@/services/pdfService';
import { logger } from '@/utils/logger';

export type ReportWithJob = { report: Report; job: Job | null; isStale: boolean; coverUri: string | null };

export function useReports() {
  const [allItems, setAllItems] = useState<ReportWithJob[]>([]);
  const [filter, setFilter] = useState<ReportsFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const reports = await reportsRepository.listAllReports();
      const latestIdByJob = new Map<string, string>();
      for (const report of reports) {
        if (!latestIdByJob.has(report.jobId)) latestIdByJob.set(report.jobId, report.id);
      }

      const jobIds = Array.from(latestIdByJob.keys());
      const [covers, jobs, freshness] = await Promise.all([
        photosRepository.getJobCoverUris(jobIds),
        Promise.all(jobIds.map((jobId) => jobsRepository.getJob(jobId))),
        Promise.all(jobIds.map((jobId) => getReportFreshness(jobId))),
      ]);
      const jobById = new Map(jobIds.map((jobId, index) => [jobId, jobs[index] ?? null]));
      const staleByJob = new Map(jobIds.map((jobId, index) => [jobId, freshness[index] === 'stale']));

      setAllItems(
        reports.map((report) => ({
          report,
          job: jobById.get(report.jobId) ?? null,
          isStale: latestIdByJob.get(report.jobId) === report.id && (staleByJob.get(report.jobId) ?? false),
          coverUri: covers[report.jobId] ?? null,
        }))
      );
      setError(null);
    } catch (err) {
      logger.error('Failed to load reports', err);
      setError("We couldn't load your reports. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch on mount; `refresh` manages its own loading/error state.
    refresh();
  }, [refresh]);

  const reload = useCallback(() => refresh(false), [refresh]);
  const refreshSilently = useCallback(() => refresh(true), [refresh]);

  const items = useMemo(() => selectReports(allItems, filter, search), [allItems, filter, search]);

  return {
    items,
    hasReports: allItems.length > 0,
    filter,
    setFilter,
    search,
    setSearch,
    loading,
    error,
    refresh: reload,
    refreshSilently,
  };
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
    refresh();
  }, [refresh]);

  return { reports, loading, refresh };
}

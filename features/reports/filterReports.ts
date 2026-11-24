import { Job, Report } from '@/models';

export type ReportsFilter = 'all' | 'active' | 'draft' | 'archived';

type SearchableReport = {
  report: Pick<Report, 'jobId' | 'generatedAt' | 'status' | 'fileName'>;
  job: Pick<Job, 'title' | 'customerName' | 'address'> | null;
};

function matchesSearch(item: SearchableReport, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (needle.length === 0) return true;
  const fields = [item.report.fileName, item.job?.title, item.job?.customerName, item.job?.address];
  return fields.some((field) => field?.toLowerCase().includes(needle));
}

/**
 * Keeps the newest report per job that matches the status filter, then applies
 * the search against the file name and the job's title, customer, and address.
 */
export function selectReports<T extends SearchableReport>(items: T[], filter: ReportsFilter, search: string): T[] {
  const matching = items.filter((item) => filter === 'all' || item.report.status === filter);
  const latestPerJob = new Map<string, T>();
  for (const item of matching) {
    const existing = latestPerJob.get(item.report.jobId);
    if (!existing || item.report.generatedAt > existing.report.generatedAt) {
      latestPerJob.set(item.report.jobId, item);
    }
  }

  return Array.from(latestPerJob.values())
    .filter((item) => matchesSearch(item, search))
    .sort((a, b) => (a.report.generatedAt < b.report.generatedAt ? 1 : -1));
}

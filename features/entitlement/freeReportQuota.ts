import { FREE_REPORT_LIMIT } from '@/models';

/**
 * Pure free-tier quota logic, kept free of database/IO imports so it can be
 * unit tested directly against representative report lists.
 */
export function countDistinctReportedJobs(reportedJobIds: string[]): number {
  return new Set(reportedJobIds).size;
}

export function isReportGenerationAllowed(
  jobId: string,
  reportedJobIds: string[],
  isPro: boolean,
  limit: number = FREE_REPORT_LIMIT
): boolean {
  if (isPro) return true;
  const distinctJobIds = new Set(reportedJobIds);
  if (distinctJobIds.has(jobId)) return true; // regenerating an existing job's report is always allowed
  return distinctJobIds.size < limit;
}

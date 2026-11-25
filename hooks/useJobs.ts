import { useCallback, useEffect, useMemo, useState } from 'react';

import { documentsRepository, jobsRepository, photosRepository } from '@/database';
import type { JobDocumentSummary } from '@/database/repositories/documentsRepository';
import { JobPhotoSummary } from '@/database/repositories/photosRepository';
import { DocumentKind, Job, effectiveStatus } from '@/models';
import { logger } from '@/utils/logger';

export type JobsDocKindFilter = 'all' | DocumentKind;

export type JobsSheetStatusFilter = 'draft' | 'sent' | 'unpaid' | 'paid' | null;

export type JobsDatePreset = 'this_month' | 'last_30' | 'custom' | null;

export type JobsSheetFilters = {
  status: JobsSheetStatusFilter;
  datePreset: JobsDatePreset;
  dateFrom: string | null;
  dateTo: string | null;
};

export const EMPTY_SHEET_FILTERS: JobsSheetFilters = {
  status: null,
  datePreset: null,
  dateFrom: null,
  dateTo: null,
};

export function sheetFiltersActive(filters: JobsSheetFilters): boolean {
  return filters.status != null || filters.datePreset != null;
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function jobDateInRange(jobDate: string, from: string | null, to: string | null): boolean {
  const day = jobDate.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function resolveDateBounds(filters: JobsSheetFilters): { from: string | null; to: string | null } {
  if (filters.datePreset === 'this_month') {
    return { from: startOfMonthIso(), to: isoToday() };
  }
  if (filters.datePreset === 'last_30') {
    return { from: daysAgoIso(30), to: isoToday() };
  }
  if (filters.datePreset === 'custom') {
    return { from: filters.dateFrom, to: filters.dateTo };
  }
  return { from: null, to: null };
}

function docMatchesSheetStatus(
  summary: JobDocumentSummary,
  kind: JobsDocKindFilter,
  status: JobsSheetStatusFilter
): boolean {
  if (!status) return true;

  const kinds: DocumentKind[] =
    kind === 'all' ? ['quote', 'report', 'invoice'] : [kind];

  return kinds.some((k) => {
    const entry = summary[k];
    if (!entry) return false;
    const eff = effectiveStatus({ kind: k, status: entry.status, dueDate: null });
    if (status === 'unpaid') return eff === 'unpaid' || eff === 'overdue' || entry.status === 'unpaid';
    if (status === 'sent') return eff === 'sent' || entry.status === 'sent';
    return eff === status || entry.status === status;
  });
}

export function useJobs() {
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [photoSummaries, setPhotoSummaries] = useState<Record<string, JobPhotoSummary>>({});
  const [documentSummaries, setDocumentSummaries] = useState<Record<string, JobDocumentSummary>>({});
  const [kindPresence, setKindPresence] = useState<Record<DocumentKind, boolean>>({
    quote: false,
    report: false,
    invoice: false,
  });
  const [docKind, setDocKindState] = useState<JobsDocKindFilter>('all');
  const [sheetFilters, setSheetFilters] = useState<JobsSheetFilters>(EMPTY_SHEET_FILTERS);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (nextSearch?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await jobsRepository.listJobs('all', nextSearch ?? search);
      setAllJobs(result);
      const [photos, docs, presence] = await Promise.all([
        photosRepository.getJobPhotoSummaries(result.map((j) => j.id)),
        documentsRepository.getJobDocumentSummaries(result.map((j) => j.id)),
        documentsRepository.getDocumentKindPresence(),
      ]);
      setPhotoSummaries(photos);
      setDocumentSummaries(docs);
      setKindPresence(presence);
    } catch (err) {
      logger.error('Failed to load jobs', err);
      setError("We couldn't load your jobs. Try again.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    refresh(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const refreshCurrent = useCallback(() => refresh(), [refresh]);

  const setDocKind = useCallback((next: JobsDocKindFilter) => {
    setDocKindState((prev) => (prev === next ? 'all' : next));
  }, []);

  const jobs = useMemo(() => {
    const { from, to } = resolveDateBounds(sheetFilters);
    return allJobs.filter((job) => {
      const summary = documentSummaries[job.id] ?? {
        quote: null,
        report: null,
        invoice: null,
      };

      if (docKind !== 'all' && !summary[docKind]) return false;
      if (!docMatchesSheetStatus(summary, docKind, sheetFilters.status)) return false;
      if ((from || to) && !jobDateInRange(job.jobDate, from, to)) return false;
      return true;
    });
  }, [allJobs, documentSummaries, docKind, sheetFilters]);

  return {
    jobs,
    photoSummaries,
    documentSummaries,
    kindPresence,
    docKind,
    setDocKind,
    sheetFilters,
    setSheetFilters,
    sheetActive: sheetFiltersActive(sheetFilters),
    search,
    setSearch,
    loading,
    error,
    refresh: refreshCurrent,
  };
}

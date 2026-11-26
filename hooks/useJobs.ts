import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { documentsRepository, jobsRepository, photosRepository } from '@/database';
import type { JobDocumentSummary } from '@/database/repositories/documentsRepository';
import { JobPhotoSummary } from '@/database/repositories/photosRepository';
import { summarizeMoney } from '@/hooks/useDocuments';
import { DocumentKind, Job, effectiveStatus } from '@/models';
import { logger } from '@/utils/logger';

const EMPTY_MONEY = summarizeMoney([]);

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
  const [docKind, setDocKindState] = useState<JobsDocKindFilter>('quote');
  const [sheetFilters, setSheetFilters] = useState<JobsSheetFilters>(EMPTY_SHEET_FILTERS);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [money, setMoney] = useState(EMPTY_MONEY);
  // Keep search in a ref so `refresh` stays identity-stable. Otherwise every
  // keystroke recreates `refresh`, and Jobs' `useFocusEffect([refresh])`
  // re-fires a non-silent load → LoadingPage unmounts the TextInput → keyboard flickers.
  const searchRef = useRef(search);
  searchRef.current = search;

  const refresh = useCallback(async (nextSearch?: string, opts?: { silent?: boolean }) => {
    // Search keystrokes must not flip `loading` — that remounts the list and
    // dismisses the keyboard (flicker).
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const result = await jobsRepository.listJobs('all', nextSearch ?? searchRef.current);
      setAllJobs(result);
      const [photos, docs, presence, allDocuments] = await Promise.all([
        photosRepository.getJobPhotoSummaries(result.map((j) => j.id)),
        documentsRepository.getJobDocumentSummaries(result.map((j) => j.id)),
        documentsRepository.getDocumentKindPresence(),
        documentsRepository.listAllDocuments(),
      ]);
      setPhotoSummaries(photos);
      setDocumentSummaries(docs);
      setKindPresence(presence);
      setMoney(summarizeMoney(allDocuments.map((document) => ({ document, job: null }))));
    } catch (err) {
      logger.error('Failed to load jobs', err);
      setError("We couldn't load your jobs. Try again.");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  const searchReady = useRef(false);
  useEffect(() => {
    // First paint: show the loading skeleton. Later search edits stay silent so
    // the TextInput keeps focus and the keyboard does not flicker.
    if (!searchReady.current) {
      searchReady.current = true;
      void refresh(search);
      return;
    }
    const handle = setTimeout(() => {
      void refresh(search, { silent: true });
    }, 250);
    return () => clearTimeout(handle);
  }, [search, refresh]);

  const refreshCurrent = useCallback(() => refresh(), [refresh]);

  const setDocKind = useCallback((next: JobsDocKindFilter) => {
    // Always keep one segment selected — tapping the active pill does not clear it.
    setDocKindState(next);
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
    outstandingInvoicePence: money.outstandingInvoicePence,
    unpaidInvoiceCount: money.unpaidInvoiceCount,
    overdueInvoiceCount: money.overdueInvoiceCount,
    overdueInvoicePence: money.overdueInvoicePence,
    paidMonthPence: money.paidMonthPence,
    waitingQuoteCount: money.waitingQuoteCount,
    waitingQuotePence: money.waitingQuotePence,
    sentQuoteCount: money.sentQuoteCount,
    sentQuotePence: money.sentQuotePence,
    awaitingQuoteCount: money.awaitingQuoteCount,
    awaitingQuotePence: money.awaitingQuotePence,
    declinedQuoteCount: money.declinedQuoteCount,
    declinedQuotePence: money.declinedQuotePence,
    sentInvoiceCount: money.sentInvoiceCount,
    sentInvoicePence: money.sentInvoicePence,
    awaitingPaymentCount: money.awaitingPaymentCount,
    awaitingPaymentPence: money.awaitingPaymentPence,
    draftInvoiceCount: money.draftInvoiceCount,
    draftInvoicePence: money.draftInvoicePence,
    draftQuoteCount: money.draftQuoteCount,
    draftQuotePence: money.draftQuotePence,
    expiresSoonCount: money.expiresSoonCount,
    acceptedQuoteCount: money.acceptedQuoteCount,
    acceptedQuotePence: money.acceptedQuotePence,
  };
}

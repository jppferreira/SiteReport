import { useCallback, useEffect, useMemo, useState } from 'react';

import { documentsRepository, jobsRepository } from '@/database';
import {
  countByStatus,
  DocumentSegment,
  DocumentStatusFilter,
  expiresSoon,
  selectDocuments,
} from '@/features/documents/filterDocuments';
import type { DocumentWithJob } from '@/features/documents/types';
import { DocumentKind, effectiveStatus, isOverdue, pricingTotalsFromSnapshot, TradeDocument } from '@/models';
import { logger } from '@/utils/logger';

export type { DocumentWithJob } from '@/features/documents/types';

export function useDocuments() {
  const [allItems, setAllItems] = useState<DocumentWithJob[]>([]);
  const [segment, setSegment] = useState<DocumentSegment>('invoice');
  const [statusFilter, setStatusFilter] = useState<DocumentStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const documents = await documentsRepository.listAllDocuments();
      const jobIds = Array.from(new Set(documents.map((d) => d.jobId)));
      const jobs = await Promise.all(jobIds.map((id) => jobsRepository.getJob(id)));
      const jobById = new Map(jobIds.map((id, i) => [id, jobs[i] ?? null]));
      setAllItems(documents.map((document) => ({ document, job: jobById.get(document.jobId) ?? null })));
      setError(null);
    } catch (err) {
      logger.error('Failed to load documents', err);
      setError("We couldn't load your documents. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const reload = useCallback(() => refresh(false), [refresh]);
  const refreshSilently = useCallback(() => refresh(true), [refresh]);

  const items = useMemo(
    () => selectDocuments(allItems, segment, statusFilter, search),
    [allItems, segment, statusFilter, search]
  );

  const statusCounts = useMemo(() => countByStatus(allItems, segment), [allItems, segment]);

  const money = useMemo(() => summarizeMoney(allItems), [allItems]);

  return {
    items,
    allItems,
    hasDocuments: allItems.length > 0,
    segment,
    setSegment,
    statusFilter,
    setStatusFilter,
    statusCounts,
    search,
    setSearch,
    loading,
    error,
    refresh: reload,
    refreshSilently,
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
    acceptedQuotePence: money.acceptedQuotePence,
  };
}

export function summarizeMoney(items: DocumentWithJob[]) {
  let outstandingInvoicePence = 0;
  let unpaidInvoiceCount = 0;
  let overdueInvoiceCount = 0;
  let overdueInvoicePence = 0;
  let paidMonthPence = 0;
  let sentInvoiceCount = 0;
  let sentInvoicePence = 0;
  let awaitingPaymentCount = 0;
  let awaitingPaymentPence = 0;
  let draftInvoiceCount = 0;
  let draftInvoicePence = 0;
  let waitingQuoteCount = 0;
  let waitingQuotePence = 0;
  let sentQuoteCount = 0;
  let sentQuotePence = 0;
  let awaitingQuoteCount = 0;
  let awaitingQuotePence = 0;
  let declinedQuoteCount = 0;
  let declinedQuotePence = 0;
  let draftQuoteCount = 0;
  let draftQuotePence = 0;
  let expiresSoonCount = 0;
  let acceptedQuoteCount = 0;
  let acceptedQuotePence = 0;

  const now = new Date();
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();

  for (const { document } of items) {
    const total = document.totalPence ?? 0;

    if (document.kind === 'invoice') {
      if (
        document.status === 'unpaid' ||
        document.status === 'sent' ||
        document.status === 'draft' ||
        isOverdue(document)
      ) {
        outstandingInvoicePence += total;
        unpaidInvoiceCount += 1;
      }
      if (document.status === 'draft') {
        draftInvoiceCount += 1;
        draftInvoicePence += total;
      }
      if (document.status === 'sent') {
        sentInvoiceCount += 1;
        sentInvoicePence += total;
      }
      // Unpaid (incl. overdue unpaid) — kept separate from `sent` so the pie doesn’t overlap.
      if (document.status === 'unpaid') {
        awaitingPaymentCount += 1;
        awaitingPaymentPence += total;
      }
      if (isOverdue(document)) {
        overdueInvoiceCount += 1;
        overdueInvoicePence += total;
      }
      if (document.status === 'paid' && document.paidAt) {
        const paid = new Date(document.paidAt);
        if (paid.getUTCMonth() === month && paid.getUTCFullYear() === year) {
          paidMonthPence += document.paidAmountPence ?? total;
        }
      }
    }
    if (document.kind === 'quote') {
      if (document.status === 'draft') {
        draftQuoteCount += 1;
        draftQuotePence += total;
        waitingQuoteCount += 1;
        waitingQuotePence += total;
      }
      // "Sent" = left draft (out with the customer or decided).
      if (document.status === 'sent' || document.status === 'accepted' || document.status === 'declined') {
        sentQuoteCount += 1;
        sentQuotePence += total;
      }
      // Still waiting on a reply.
      if (document.status === 'sent') {
        awaitingQuoteCount += 1;
        awaitingQuotePence += total;
        waitingQuoteCount += 1;
        waitingQuotePence += total;
      }
      if (document.status === 'declined') {
        declinedQuoteCount += 1;
        declinedQuotePence += total;
      }
      if (expiresSoon(document)) expiresSoonCount += 1;
      if (effectiveStatus(document) === 'accepted') {
        acceptedQuoteCount += 1;
        acceptedQuotePence += total;
      }
    }
  }

  return {
    outstandingInvoicePence,
    unpaidInvoiceCount,
    overdueInvoiceCount,
    overdueInvoicePence,
    paidMonthPence,
    sentInvoiceCount,
    sentInvoicePence,
    awaitingPaymentCount,
    awaitingPaymentPence,
    draftInvoiceCount,
    draftInvoicePence,
    waitingQuoteCount,
    waitingQuotePence,
    sentQuoteCount,
    sentQuotePence,
    awaitingQuoteCount,
    awaitingQuotePence,
    declinedQuoteCount,
    declinedQuotePence,
    draftQuoteCount,
    draftQuotePence,
    expiresSoonCount,
    acceptedQuoteCount,
    acceptedQuotePence,
  };
}

export function totalsFromDocument(doc: TradeDocument): number | null {
  if (doc.totalPence != null) return doc.totalPence;
  const snap = pricingTotalsFromSnapshot(doc.pricingSnapshotJson);
  return snap.totalPence;
}

export function segmentLabelKind(segment: DocumentSegment): DocumentKind {
  return segment;
}
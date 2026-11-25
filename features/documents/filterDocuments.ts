import {
  DocumentKind,
  effectiveStatus,
  EffectiveDocumentStatus,
  isOverdue,
  TradeDocument,
} from '@/models';

import { DocumentWithJob } from './types';

export type DocumentSegment = DocumentKind;
export type DocumentStatusFilter = 'all' | EffectiveDocumentStatus | 'expires_soon';

type DocTiming = Pick<TradeDocument, 'kind' | 'status' | 'dueDate' | 'validUntil'>;

export function expiresSoon(doc: DocTiming, withinDays = 7, today?: string | Date): boolean {
  if (doc.kind !== 'quote') return false;
  if (!doc.validUntil) return false;
  if (doc.status === 'accepted' || doc.status === 'declined') return false;
  const until = doc.validUntil.slice(0, 10);
  const todayStr =
    today instanceof Date
      ? today.toISOString().slice(0, 10)
      : typeof today === 'string'
        ? today.slice(0, 10)
        : new Date().toISOString().slice(0, 10);
  if (until < todayStr) return false;
  const end = new Date(`${until}T00:00:00Z`);
  const start = new Date(`${todayStr}T00:00:00Z`);
  const diffDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays >= 0 && diffDays <= withinDays;
}

export function displayStatus(doc: DocTiming, today?: string | Date): EffectiveDocumentStatus | 'expires_soon' {
  if (expiresSoon(doc, 7, today)) return 'expires_soon';
  return effectiveStatus(doc, today);
}

export function selectDocuments(
  items: DocumentWithJob[],
  segment: DocumentSegment,
  statusFilter: DocumentStatusFilter,
  search: string,
  today?: string | Date
): DocumentWithJob[] {
  const q = search.trim().toLowerCase();
  return items.filter((item) => {
    if (item.document.kind !== segment) return false;
    const eff = displayStatus(item.document, today);
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        if (!isOverdue(item.document, today)) return false;
      } else if (statusFilter === 'expires_soon') {
        if (!expiresSoon(item.document, 7, today)) return false;
      } else if (eff !== statusFilter && effectiveStatus(item.document, today) !== statusFilter) {
        return false;
      }
    }
    if (!q) return true;
    const jobTitle = item.job?.title?.toLowerCase() ?? '';
    const customer = item.job?.customerName?.toLowerCase() ?? '';
    const number = item.document.number?.toLowerCase() ?? '';
    const title = item.document.title?.toLowerCase() ?? '';
    return jobTitle.includes(q) || customer.includes(q) || number.includes(q) || title.includes(q);
  });
}

export function countByStatus(
  items: DocumentWithJob[],
  segment: DocumentSegment,
  today?: string | Date
): Record<string, number> {
  const filtered = items.filter((i) => i.document.kind === segment);
  const counts: Record<string, number> = { all: filtered.length };
  for (const item of filtered) {
    const eff = displayStatus(item.document, today);
    counts[eff] = (counts[eff] ?? 0) + 1;
    const base = effectiveStatus(item.document, today);
    counts[base] = (counts[base] ?? 0) + 1;
  }
  return counts;
}
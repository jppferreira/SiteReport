import { VAT_RATE_PERCENT } from './documentType';

export const DOCUMENT_KINDS = ['quote', 'report', 'invoice'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'declined'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const INVOICE_STATUSES = ['draft', 'sent', 'unpaid', 'paid'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const REPORT_DOCUMENT_STATUSES = ['draft', 'sent'] as const;
export type ReportDocumentStatus = (typeof REPORT_DOCUMENT_STATUSES)[number];

export type DocumentStatus = QuoteStatus | InvoiceStatus | ReportDocumentStatus;

/** Display-only status when an unpaid invoice is past due. */
export type EffectiveDocumentStatus = DocumentStatus | 'overdue';

export type TradeDocument = {
  id: string;
  jobId: string;
  kind: DocumentKind;
  number: string | null;
  status: DocumentStatus;
  title: string | null;
  totalPence: number | null;
  netPence: number | null;
  vatPence: number | null;
  dueDate: string | null;
  validUntil: string | null;
  sentAt: string | null;
  paidAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  paidMethod: string | null;
  paidAmountPence: number | null;
  sourceDocumentId: string | null;
  attachedReportId: string | null;
  pricingSnapshotJson: string | null;
  reportId: string | null;
  localPdfUri: string | null;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  unpaid: 'Unpaid',
  paid: 'Paid',
};

export const REPORT_DOCUMENT_STATUS_LABELS: Record<ReportDocumentStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
};

export function isDocumentKind(value: unknown): value is DocumentKind {
  return typeof value === 'string' && (DOCUMENT_KINDS as readonly string[]).includes(value);
}

export function normalizeDocumentKind(value: unknown): DocumentKind {
  return isDocumentKind(value) ? value : 'quote';
}

export function isQuoteStatus(value: unknown): value is QuoteStatus {
  return typeof value === 'string' && (QUOTE_STATUSES as readonly string[]).includes(value);
}

export function normalizeQuoteStatus(value: unknown): QuoteStatus {
  return isQuoteStatus(value) ? value : 'draft';
}

export function isInvoiceStatus(value: unknown): value is InvoiceStatus {
  return typeof value === 'string' && (INVOICE_STATUSES as readonly string[]).includes(value);
}

export function normalizeInvoiceStatus(value: unknown): InvoiceStatus {
  return isInvoiceStatus(value) ? value : 'draft';
}

export function isReportDocumentStatus(value: unknown): value is ReportDocumentStatus {
  return typeof value === 'string' && (REPORT_DOCUMENT_STATUSES as readonly string[]).includes(value);
}

export function normalizeReportDocumentStatus(value: unknown): ReportDocumentStatus {
  return isReportDocumentStatus(value) ? value : 'draft';
}

export function normalizeDocumentStatus(kind: DocumentKind, value: unknown): DocumentStatus {
  if (kind === 'quote') return normalizeQuoteStatus(value);
  if (kind === 'invoice') return normalizeInvoiceStatus(value);
  return normalizeReportDocumentStatus(value);
}

export function mapReportStatusToDocumentStatus(reportStatus: string): ReportDocumentStatus {
  if (reportStatus === 'draft') return 'draft';
  return 'sent';
}

/** Builds QUO-0001 style numbers from a 1-based counter. */
export function formatQuoteNumber(sequence: number): string {
  const n = Math.max(1, Math.min(999999, Math.trunc(sequence)));
  return `QUO-${String(n).padStart(4, '0')}`;
}

export function documentRequiresPro(kind: DocumentKind): boolean {
  return kind === 'quote' || kind === 'invoice';
}

function todayIsoDate(today?: string | Date): string {
  if (today instanceof Date) return today.toISOString().slice(0, 10);
  if (typeof today === 'string' && /^\d{4}-\d{2}-\d{2}/.test(today)) return today.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

export function isOverdue(doc: Pick<TradeDocument, 'kind' | 'status' | 'dueDate'>, today?: string | Date): boolean {
  if (doc.kind !== 'invoice') return false;
  if (doc.status !== 'unpaid' && doc.status !== 'sent') return false;
  if (!doc.dueDate) return false;
  const due = doc.dueDate.slice(0, 10);
  return due < todayIsoDate(today);
}

export function effectiveStatus(
  doc: Pick<TradeDocument, 'kind' | 'status' | 'dueDate'>,
  today?: string | Date
): EffectiveDocumentStatus {
  if (isOverdue(doc, today)) return 'overdue';
  return doc.status;
}

export function documentStatusLabel(
  kind: DocumentKind,
  status: EffectiveDocumentStatus
): string {
  if (status === 'overdue') return 'Overdue';
  if (kind === 'quote' && isQuoteStatus(status)) return QUOTE_STATUS_LABELS[status];
  if (kind === 'invoice' && isInvoiceStatus(status)) return INVOICE_STATUS_LABELS[status];
  if (kind === 'report' && isReportDocumentStatus(status)) return REPORT_DOCUMENT_STATUS_LABELS[status];
  return String(status);
}

export function quoteValidUntilFromCreated(createdAtIso: string, validityDays: number): string {
  const base = new Date(createdAtIso);
  if (Number.isNaN(base.getTime())) return todayIsoDate();
  base.setUTCDate(base.getUTCDate() + Math.max(0, validityDays));
  return base.toISOString().slice(0, 10);
}

export function pricingTotalsFromSnapshot(
  pricingSnapshotJson: string | null,
  vatRatePercent = VAT_RATE_PERCENT
): { netPence: number | null; vatPence: number | null; totalPence: number | null } {
  if (!pricingSnapshotJson?.trim()) {
    return { netPence: null, vatPence: null, totalPence: null };
  }
  try {
    const raw = JSON.parse(pricingSnapshotJson) as { lines?: unknown[]; enabled?: boolean };
    const lines = Array.isArray(raw.lines) ? raw.lines : [];
    let net = 0;
    let any = false;
    for (const item of lines) {
      if (!item || typeof item !== 'object') continue;
      const amount = (item as { amount?: unknown }).amount;
      const str = typeof amount === 'string' ? amount : String(amount ?? '');
      const cleaned = str.replace(/[£,\s]/g, '');
      if (!cleaned || cleaned === '.') continue;
      if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) continue;
      const [whole = '0', frac = ''] = cleaned.split('.');
      const pence = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
      if (!Number.isFinite(pence)) continue;
      any = true;
      net += pence;
    }
    if (!any) return { netPence: null, vatPence: null, totalPence: null };
    const vatPence = Math.round((net * vatRatePercent) / 100);
    return { netPence: net, vatPence, totalPence: net + vatPence };
  } catch {
    return { netPence: null, vatPence: null, totalPence: null };
  }
}
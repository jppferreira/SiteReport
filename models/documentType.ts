export const DOCUMENT_TYPES = ['reference', 'quote', 'invoice'] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  reference: 'Reference',
  quote: 'Quote',
  invoice: 'Invoice',
};

export const DEFAULT_DOCUMENT_TYPE: DocumentType = 'reference';

/** UK VAT rate used on quote and invoice PDFs when VAT applies. */
export const VAT_RATE_PERCENT = 20;

export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === 'string' && (DOCUMENT_TYPES as readonly string[]).includes(value);
}

export function normalizeDocumentType(value: unknown): DocumentType {
  return isDocumentType(value) ? value : DEFAULT_DOCUMENT_TYPE;
}

/** Quote and invoice are Pro; reference stays free. */
export function documentTypeRequiresPro(type: DocumentType): boolean {
  return type === 'quote' || type === 'invoice';
}

export function normalizeInvoiceNumber(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, 40);
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeDueDays(value: unknown, fallback = 14): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(365, Math.max(0, Math.round(n)));
}

/** Builds INV-0001 style numbers from a 1-based counter. */
export function formatInvoiceNumber(sequence: number): string {
  const n = Math.max(1, Math.min(999999, Math.trunc(sequence)));
  return `INV-${String(n).padStart(4, '0')}`;
}

/** Due date ISO (date only) from a job date + days. */
export function dueDateFromJob(jobDateIso: string, dueDays: number): string {
  const base = new Date(`${jobDateIso.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(base.getTime())) {
    const now = new Date();
    now.setUTCDate(now.getUTCDate() + dueDays);
    return now.toISOString().slice(0, 10);
  }
  base.setUTCDate(base.getUTCDate() + dueDays);
  return base.toISOString().slice(0, 10);
}

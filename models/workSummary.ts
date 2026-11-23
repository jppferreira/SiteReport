import { DocumentType, normalizeDocumentType, normalizeInvoiceNumber } from './documentType';
import { ReportPricing } from './pricing';

export type WorkSummary = {
  jobId: string;
  workCompleted: string | null;
  materials: string | null;
  recommendations: string | null;
  notes: string | null;
  /** Optional cost figures for the report. A reference, not an invoice. */
  pricing: ReportPricing;
  /** How price lines are titled on the PDF. */
  documentType: DocumentType;
  /** Assigned when the job is first exported as an invoice. */
  invoiceNumber: string | null;
  updatedAt: string;
};

export function coerceWorkSummaryDocumentFields(row: Record<string, unknown>): {
  documentType: DocumentType;
  invoiceNumber: string | null;
} {
  return {
    documentType: normalizeDocumentType(row.documentType),
    invoiceNumber: normalizeInvoiceNumber(row.invoiceNumber),
  };
}

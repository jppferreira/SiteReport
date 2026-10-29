import { ReportPricing } from './pricing';

export type WorkSummary = {
  jobId: string;
  workCompleted: string | null;
  materials: string | null;
  recommendations: string | null;
  notes: string | null;
  /** Optional cost figures for the report. A reference, not an invoice. */
  pricing: ReportPricing;
  updatedAt: string;
};

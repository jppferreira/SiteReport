/** Local delivery / activity log for a generated report (Figma Field Proof · 07). */

export type ReportEventKind = 'created' | 'shared' | 'emailed';

export type ReportEvent = {
  id: string;
  reportId: string;
  jobId: string;
  kind: ReportEventKind;
  label: string;
  recipient: string | null;
  createdAt: string;
};

export function normalizeReportEventKind(value: unknown): ReportEventKind {
  if (value === 'shared' || value === 'emailed' || value === 'created') return value;
  return 'shared';
}

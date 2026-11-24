/** Same display order as REPORT_TEMPLATES — nicest layouts first. */
export const REPORT_TEMPLATE_IDS = [
  'studio',
  'stone',
  'clearline',
  'atelier',
  'botanical',
  'field',
  'thermal',
  'blueprint',
  'circuit',
  'solaris',
  'sentinel',
  'image',
  'dark',
  'trade',
  'side',
  'modern',
  'minimal',
  'cards',
] as const;

export type ReportTemplateId = (typeof REPORT_TEMPLATE_IDS)[number];

export const DEFAULT_REPORT_TEMPLATE: ReportTemplateId = 'modern';

/** Plain layouts included on the free tier. The other layouts are Pro. */
export const FREE_REPORT_TEMPLATE_IDS = ['modern', 'minimal', 'cards'] as const;

/** Trade-specific Pro layouts from the Feature Concepts board. Each owns cover + interior. */
export const PREMIUM_TRADE_TEMPLATE_IDS = [
  'thermal',
  'circuit',
  'studio',
  'field',
  'atelier',
  'botanical',
  'stone',
  'solaris',
  'blueprint',
  'clearline',
  'sentinel',
] as const;

export function isPremiumTradeTemplate(id: ReportTemplateId): boolean {
  return (PREMIUM_TRADE_TEMPLATE_IDS as readonly string[]).includes(id);
}

export function isFreeReportTemplate(id: ReportTemplateId): boolean {
  return (FREE_REPORT_TEMPLATE_IDS as readonly string[]).includes(id);
}

/** A free account keeps a plain layout. A Pro layout is left unchanged. */
export function templateAllowedForTier(id: ReportTemplateId, isPro: boolean): ReportTemplateId {
  if (isPro || isFreeReportTemplate(id)) return id;
  return DEFAULT_REPORT_TEMPLATE;
}

/** Layouts saved before the six-page set. Mapped so existing jobs still open a current design. */
const LEGACY_REPORT_TEMPLATES: Record<string, ReportTemplateId> = {
  classic: 'modern',
  compact: 'cards',
  gallery: 'image',
  formal: 'minimal',
};

export function isReportTemplateId(value: unknown): value is ReportTemplateId {
  return typeof value === 'string' && (REPORT_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function normalizeReportTemplateId(value: unknown): ReportTemplateId {
  if (isReportTemplateId(value)) return value;
  if (typeof value === 'string' && value in LEGACY_REPORT_TEMPLATES) {
    return LEGACY_REPORT_TEMPLATES[value] ?? DEFAULT_REPORT_TEMPLATE;
  }
  return DEFAULT_REPORT_TEMPLATE;
}

export const REPORT_STATUSES = ['active', 'draft', 'archived'] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export function normalizeReportStatus(value: unknown): ReportStatus {
  return typeof value === 'string' && (REPORT_STATUSES as readonly string[]).includes(value)
    ? (value as ReportStatus)
    : 'active';
}

export type Report = {
  id: string;
  jobId: string;
  localPdfUri: string;
  fileName: string;
  generatedAt: string;
  fileSize: number;
  version: number;
  /** Hash of the job content the report was generated from, used to detect staleness. */
  sourceHash: string;
  /** Layout used when this file was created. */
  templateId: ReportTemplateId;
  /** Filing state shown by the reports list filter. New reports start active. */
  status: ReportStatus;
};

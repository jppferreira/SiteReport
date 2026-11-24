import type { CoverDesignId } from './coverDesign';
import type { ReportTemplateId } from './report';

/** Modular PDF blocks the preview tray can show, hide, or reorder. */
export const REPORT_SECTION_IDS = [
  'cover',
  'photos',
  'checklist',
  'costs',
  'signature',
  'review',
] as const;

export type ReportSectionId = (typeof REPORT_SECTION_IDS)[number];

export type ReportSections = Record<ReportSectionId, boolean>;

export const DEFAULT_REPORT_SECTIONS: ReportSections = {
  cover: true,
  photos: true,
  checklist: true,
  costs: true,
  signature: true,
  review: true,
};

export const DEFAULT_REPORT_SECTION_ORDER: ReportSectionId[] = [...REPORT_SECTION_IDS];

export function isReportSectionId(value: unknown): value is ReportSectionId {
  return typeof value === 'string' && (REPORT_SECTION_IDS as readonly string[]).includes(value);
}

export function normalizeReportSections(value: unknown): ReportSections {
  const next = { ...DEFAULT_REPORT_SECTIONS };
  if (!value || typeof value !== 'object') return next;
  const record = value as Record<string, unknown>;
  for (const id of REPORT_SECTION_IDS) {
    if (typeof record[id] === 'boolean') next[id] = record[id];
  }
  return next;
}

/** Keeps every section once; unknown ids dropped; missing ids appended in default order. */
export function normalizeReportSectionOrder(value: unknown): ReportSectionId[] {
  const seen = new Set<ReportSectionId>();
  const ordered: ReportSectionId[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!isReportSectionId(item) || seen.has(item)) continue;
      seen.add(item);
      ordered.push(item);
    }
  }
  for (const id of REPORT_SECTION_IDS) {
    if (seen.has(id)) continue;
    ordered.push(id);
  }
  return ordered;
}

/** Trade filters on the expanded Templates tab. */
export const TEMPLATE_TRADE_FILTERS = ['all', 'plumbing', 'electrical', 'kitchens'] as const;

export type TemplateTradeFilter = (typeof TEMPLATE_TRADE_FILTERS)[number];

const TRADE_FILTER_TEMPLATES: Record<Exclude<TemplateTradeFilter, 'all'>, readonly ReportTemplateId[]> = {
  plumbing: ['thermal', 'stone'],
  electrical: ['circuit', 'sentinel', 'solaris'],
  kitchens: ['studio', 'trade', 'atelier'],
};

export function templatesForTradeFilter(filter: TemplateTradeFilter): readonly ReportTemplateId[] | null {
  if (filter === 'all') return null;
  return TRADE_FILTER_TEMPLATES[filter];
}

export function templateMatchesTradeFilter(
  templateId: ReportTemplateId,
  filter: TemplateTradeFilter
): boolean {
  const allowed = templatesForTradeFilter(filter);
  return allowed == null || allowed.includes(templateId);
}

/** Cover style chips in the Colour tab → existing cover design ids. */
export const TRAY_COVER_STYLES: { id: CoverDesignId; labelKey: string }[] = [
  { id: 'editorial', labelKey: 'preview.coverStyleDarkBand' },
  { id: 'split', labelKey: 'preview.coverStyleLight' },
  { id: 'bleed', labelKey: 'preview.coverStyleFullPhoto' },
];

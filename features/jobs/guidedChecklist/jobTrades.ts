import type { ReportTemplateId } from '@/models';

/** Job-type chips on the guided Job details sheet (Figma 04). */
export const JOB_TRADE_IDS = [
  'kitchens',
  'bathrooms',
  'plumbing',
  'heating',
  'electrical',
  'roofing',
  'building',
  'decorating',
  'joinery',
  'more',
] as const;

export type JobTradeId = (typeof JOB_TRADE_IDS)[number];

export function isJobTradeId(value: unknown): value is JobTradeId {
  return typeof value === 'string' && (JOB_TRADE_IDS as readonly string[]).includes(value);
}

export function normalizeJobTradeId(value: unknown): JobTradeId | null {
  return isJobTradeId(value) ? value : null;
}

type TradeSuggestion = {
  templateId: ReportTemplateId;
  /** Short blurb under the template name. */
  blurbKey: string;
  /** Optional Pro checklist line under the blurb. */
  checklistKey: string | null;
};

const SUGGESTIONS: Record<Exclude<JobTradeId, 'more'>, TradeSuggestion> = {
  kitchens: {
    templateId: 'modern',
    blurbKey: 'jobDetail.guided.sheet.blurbKitchens',
    checklistKey: 'jobDetail.guided.sheet.checklistKitchens',
  },
  bathrooms: {
    templateId: 'modern',
    blurbKey: 'jobDetail.guided.sheet.blurbBathrooms',
    checklistKey: 'jobDetail.guided.sheet.checklistBathrooms',
  },
  plumbing: {
    templateId: 'thermal',
    blurbKey: 'jobDetail.guided.sheet.blurbPlumbing',
    checklistKey: 'jobDetail.guided.sheet.checklistPlumbing',
  },
  heating: {
    templateId: 'thermal',
    blurbKey: 'jobDetail.guided.sheet.blurbHeating',
    checklistKey: 'jobDetail.guided.sheet.checklistHeating',
  },
  electrical: {
    templateId: 'circuit',
    blurbKey: 'jobDetail.guided.sheet.blurbElectrical',
    checklistKey: 'jobDetail.guided.sheet.checklistElectrical',
  },
  roofing: {
    templateId: 'field',
    blurbKey: 'jobDetail.guided.sheet.blurbRoofing',
    checklistKey: 'jobDetail.guided.sheet.checklistRoofing',
  },
  building: {
    templateId: 'trade',
    blurbKey: 'jobDetail.guided.sheet.blurbBuilding',
    checklistKey: null,
  },
  decorating: {
    templateId: 'atelier',
    blurbKey: 'jobDetail.guided.sheet.blurbDecorating',
    checklistKey: null,
  },
  joinery: {
    templateId: 'studio',
    blurbKey: 'jobDetail.guided.sheet.blurbJoinery',
    checklistKey: null,
  },
};

export function suggestionForTrade(trade: JobTradeId | null): TradeSuggestion {
  if (!trade || trade === 'more') {
    return {
      templateId: 'modern',
      blurbKey: 'jobDetail.guided.sheet.blurbDefault',
      checklistKey: null,
    };
  }
  return SUGGESTIONS[trade];
}

export function tradeLabelKey(trade: JobTradeId): string {
  return `jobDetail.guided.sheet.trades.${trade}`;
}

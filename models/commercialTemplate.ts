/** Quote / invoice PDF layouts (Figma Feature Concepts · branded commercial sheets). */
export const COMMERCIAL_TEMPLATE_IDS = ['classic', 'bold', 'minimal'] as const;

export type CommercialTemplateId = (typeof COMMERCIAL_TEMPLATE_IDS)[number];

export const DEFAULT_COMMERCIAL_TEMPLATE: CommercialTemplateId = 'classic';

/** Fallback accent when the business profile has no colour set. */
export const COMMERCIAL_ACCENT_FALLBACK = '#17753b';

export type CommercialTemplateMeta = {
  id: CommercialTemplateId;
  label: string;
  description: string;
};

export const COMMERCIAL_TEMPLATES: readonly CommercialTemplateMeta[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Accent bar letterhead with a soft table header.',
  },
  {
    id: 'bold',
    label: 'Bold',
    description: 'Dark letterhead, zebra rows, and a filled total.',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Clean type and hairline rules only.',
  },
] as const;

export function isCommercialTemplateId(value: unknown): value is CommercialTemplateId {
  return typeof value === 'string' && (COMMERCIAL_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function normalizeCommercialTemplateId(value: unknown): CommercialTemplateId {
  return isCommercialTemplateId(value) ? value : DEFAULT_COMMERCIAL_TEMPLATE;
}

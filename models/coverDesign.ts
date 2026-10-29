/** First page of a report. Editorial is the original dark cover. */
export const COVER_DESIGN_IDS = ['editorial', 'bleed', 'split', 'poster'] as const;

export type CoverDesignId = (typeof COVER_DESIGN_IDS)[number];

export const DEFAULT_COVER_DESIGN: CoverDesignId = 'editorial';

export type CoverDesignOption = {
  id: CoverDesignId;
  label: string;
  hint: string;
  description: string;
};

export const COVER_DESIGNS: CoverDesignOption[] = [
  {
    id: 'editorial',
    label: 'Editorial',
    hint: 'Classic',
    description: 'A dark cover with the job details, a photo band, and customer badges.',
  },
  {
    id: 'bleed',
    label: 'Photo',
    hint: 'Full page',
    description: 'The cover photo fills the page, with the title and details over a gradient.',
  },
  {
    id: 'split',
    label: 'Split',
    hint: 'Side by side',
    description: 'Job details on the left and the cover photo on the right.',
  },
  {
    id: 'poster',
    label: 'Poster',
    hint: 'Bold type',
    description: 'A large title, a shaped photo, and the job details underneath.',
  },
];

export function isCoverDesignId(value: unknown): value is CoverDesignId {
  return typeof value === 'string' && (COVER_DESIGN_IDS as readonly string[]).includes(value);
}

export function normalizeCoverDesignId(value: unknown): CoverDesignId {
  return isCoverDesignId(value) ? value : DEFAULT_COVER_DESIGN;
}

export function coverDesignLabel(id: CoverDesignId): string {
  return COVER_DESIGNS.find((design) => design.id === id)?.label ?? COVER_DESIGNS[0]!.label;
}

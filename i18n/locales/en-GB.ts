import enUS, { type TranslationTree } from './en-US';

/**
 * Deep-merge helper so nested domains can be overridden without rewriting the whole tree.
 * Arrays and primitives from `patch` replace; plain objects merge recursively.
 */
function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (patch === undefined) return base;
  if (Array.isArray(base) || Array.isArray(patch) || typeof base !== 'object' || base === null) {
    return patch as T;
  }
  const result = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (value === undefined) continue;
    const current = result[key];
    result[key] =
      current !== null &&
      typeof current === 'object' &&
      !Array.isArray(current) &&
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
        ? deepMerge(current, value as DeepPartial<typeof current>)
        : value;
  }
  return result as T;
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly (infer U)[]
    ? readonly U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

/**
 * English (United Kingdom).
 * Deep-merges British spelling overrides onto the American en-US catalog.
 */
const enGBOverrides = {
  summary: {
    fieldLabour: 'Labour Details (optional)',
  },
  pricing: {
    includeDescription: 'Add materials, labour and other costs as a reference on this report.',
    categoryLabour: 'Labour',
  },
  branding: {
    accentColour: 'ACCENT COLOUR',
    accentSwatchA11y: 'Accent colour %{color}',
    customAccentA11y: 'Custom accent colour',
    customAccentNamedA11y: 'Custom accent colour %{color}',
    customColour: 'Custom colour',
    customColourProA11y: 'Custom colour is a Pro feature',
    customColourChooserA11y: 'Choose a custom accent colour',
  },
  terms: {
    freeProBody:
      'The free tier includes PDF reports for 3 jobs. Generating another report for a job that already has one does not use a new slot. Pro unlocks unlimited reports, your logo and accent colour on reports, and customer signatures. The price is the amount shown in the app at the time you confirm the purchase, charged by Apple or Google.',
  },
  paywall: {
    triggerColour:
      'Upgrade to choose the accent colour on your reports. Pro includes your colour on every report.',
  },
  onboarding: {
    captureBody: 'Snap the job as you go. Photos stay organised by area in the report.',
    documentBody: 'Note what you did, what you used, and labour — costs stay optional.',
  },
} as const;

const enGB: TranslationTree = deepMerge(
  enUS as TranslationTree,
  enGBOverrides as DeepPartial<TranslationTree>
);

export default enGB;
export type { TranslationTree };

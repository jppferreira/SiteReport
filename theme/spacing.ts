/**
 * 8pt-based spacing scale. Always reference these tokens instead of raw
 * numbers so layout rhythm stays consistent across the app.
 */
export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  giant: 64,
} as const;

export type SpacingToken = keyof typeof spacing;

/** Default horizontal padding applied to full-bleed screens. */
export const screenPadding = spacing.lg;

/** Vertical gap used to separate major sections within a screen. */
export const sectionGap = spacing.xxl;

/** Standard card internal padding. */
export const cardPadding = spacing.md;

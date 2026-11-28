import type { TabletBreakpoint } from '@/hooks/useTabletBreakpoint';

/**
 * Trade Report iPad layout tokens, matching the Figma "TR Layout" variable collection.
 * Values scale between 11″ (compact) and 12.9″ (regular) breakpoints, with separate
 * portrait and landscape configurations.
 *
 * Figma reference: file cx8vbNioHk2dUTGbCMRxAE, variables collection "TR Layout (iPad)"
 * - Mode 268:10: 12.9″ portrait
 * - Mode 268:11: 11″ portrait
 * - 12.9″ landscape
 * - 11″ landscape
 */

export type LayoutTokens = {
  /** Leading rail/sidebar width. Icon-only at 11″ portrait (80), full at 12.9″+ (88). */
  rail: number;

  /** List column width in split views (Jobs, Settings). Portrait: 320-376, Landscape: 360-400. */
  listColumn: number;

  /** Max width for content columns (forms, documents). Detail panes cap at this width. */
  contentMaxWidth: number;

  /** Inspector width for PDF/Report preview side panels. Portrait: 288-320, Landscape: 320-340. */
  inspector: number;

  /** Pane internal padding. Portrait: 24-32, Landscape: 32-40. */
  panePadding: number;
};

/**
 * Returns layout token values for the current tablet breakpoint.
 * On phone (isTablet: false), returns neutral/unused values; phone layouts don't use these tokens.
 */
export function getLayoutTokens(breakpoint: TabletBreakpoint): LayoutTokens {
  const { isTablet, isCompact, isLandscape } = breakpoint;

  if (!isTablet) {
    // Phone layout: tokens are not used. Return safe defaults.
    return {
      rail: 0,
      listColumn: 0,
      contentMaxWidth: 0,
      inspector: 0,
      panePadding: 0,
    };
  }

  if (isLandscape) {
    // Landscape: 11″ (compact) vs 12.9″ (regular)
    return {
      rail: 88, // Same in both landscape sizes
      listColumn: isCompact ? 360 : 400,
      contentMaxWidth: isCompact ? 720 : 800,
      inspector: isCompact ? 320 : 340,
      panePadding: isCompact ? 32 : 40,
    };
  }

  // Portrait: 11″ (compact) vs 12.9″ (regular)
  return {
    rail: isCompact ? 80 : 88, // Icon-only at 11″, full at 12.9″
    listColumn: isCompact ? 320 : 376,
    contentMaxWidth: isCompact ? 720 : 800,
    inspector: isCompact ? 288 : 320,
    panePadding: isCompact ? 24 : 32,
  };
}

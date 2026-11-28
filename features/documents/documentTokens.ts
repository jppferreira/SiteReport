import { colors } from '@/theme/colors';
import type { DocumentKind } from '@/models';

/**
 * Document tile background colors. These values are now themeable and stored
 * in the color scheme, but we export a function here for backwards compatibility.
 */
export function getDocTileBg(kind: DocumentKind, scheme: 'light' | 'dark' = 'light'): string {
  const themeColors = colors[scheme];
  // Return themed colors for doc tiles
  if (kind === 'quote') return scheme === 'light' ? '#E8F0FC' : '#1E2A3F';
  if (kind === 'report') return scheme === 'light' ? '#E7F6EC' : '#1A2E22';
  if (kind === 'invoice') return scheme === 'light' ? '#F0EAFB' : '#2A2140';
  return themeColors.surface;
}

/** Legacy export for backwards compatibility. Use theme colors directly instead. */
export const DOC_KIND_TILE_BG: Record<DocumentKind, string> = {
  quote: '#E8F0FC',
  report: '#E7F6EC',
  invoice: '#F0EAFB',
};

// These are now part of the theme color scheme (docSolidLabel, pipQuote etc.)
// but kept here for gradual migration.
export const DOC_SENT_BLUE = '#2F6FDB';
export const DOC_SENT_BLUE_SOFT = '#E8F0FC';
export const DOC_PRO_BG = '#101310';
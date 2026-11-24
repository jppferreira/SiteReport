/** Shared look for the AR tools (Measure + Level): dark glass on camera / dark metal. */
export const AR_COLORS = {
  brand: '#1FA84A',
  brandSoft: 'rgba(31,168,74,0.18)',
  brandBorder: 'rgba(31,168,74,0.65)',
  brandText: '#7CE29F',
  ink: '#121412',
  bg: '#0E100E',
  offLevel: '#E8C547',
  warning: '#F2A93B',
  warningSoft: 'rgba(242,169,59,0.18)',
  glass: 'rgba(18,20,18,0.55)',
  glassStrong: 'rgba(18,20,18,0.72)',
  glassBorder: 'rgba(255,255,255,0.12)',
  pill: 'rgba(255,255,255,0.08)',
  pillBorder: 'rgba(255,255,255,0.08)',
  textDim: 'rgba(255,255,255,0.55)',
  textSoft: 'rgba(255,255,255,0.75)',
  /** Light glass over a camera feed (Figma: rgba(255,255,255,0.84)). */
  lightGlass: 'rgba(255,255,255,0.84)',
  sheet: '#FFFFFF',
  row: '#F4F6F4',
  rowSelected: '#EAF7EE',
  iconTile: '#E3F4E8',
  muted: '#6B706B',
} as const;

export type ArToolMode = 'measure' | 'level';

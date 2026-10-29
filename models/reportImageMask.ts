/** How the cover and thank-you photos are cut. Straight keeps a hard rectangular edge. */
export const REPORT_IMAGE_MASKS = ['straight', 'diagonal', 'peak', 'arch', 'wave'] as const;

export type ReportImageMask = (typeof REPORT_IMAGE_MASKS)[number];

export const DEFAULT_REPORT_IMAGE_MASK: ReportImageMask = 'straight';

/** Where the cut sits. A band trims the top and bottom. A bleed runs to the page edge. */
export type ImageMaskEdge = 'band' | 'bleed' | 'side' | 'panel';

const MASK_LABELS: Record<ReportImageMask, string> = {
  straight: 'Straight',
  diagonal: 'Diagonal',
  peak: 'Peak',
  arch: 'Arch',
  wave: 'Wave',
};

type Point = [number, number];

const FULL: Point[] = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
];

const BAND: Record<Exclude<ReportImageMask, 'straight'>, Point[]> = {
  diagonal: [
    [0, 14],
    [100, 0],
    [100, 86],
    [0, 100],
  ],
  peak: [
    [0, 16],
    [50, 0],
    [100, 16],
    [100, 84],
    [50, 100],
    [0, 84],
  ],
  arch: [
    [0, 22],
    [8, 12],
    [18, 6],
    [32, 2],
    [50, 0],
    [68, 2],
    [82, 6],
    [92, 12],
    [100, 22],
    [100, 78],
    [92, 88],
    [82, 94],
    [68, 98],
    [50, 100],
    [32, 98],
    [18, 94],
    [8, 88],
    [0, 78],
  ],
  wave: [
    [0, 10],
    [16, 0],
    [33, 12],
    [50, 4],
    [67, 14],
    [84, 2],
    [100, 12],
    [100, 88],
    [84, 100],
    [67, 86],
    [50, 98],
    [33, 88],
    [16, 100],
    [0, 90],
  ],
};

const BLEED: Record<Exclude<ReportImageMask, 'straight'>, Point[]> = {
  diagonal: [
    [0, 16],
    [100, 0],
    [100, 100],
    [0, 100],
  ],
  peak: [
    [0, 18],
    [50, 0],
    [100, 18],
    [100, 100],
    [0, 100],
  ],
  arch: [
    [0, 22],
    [8, 12],
    [18, 6],
    [32, 2],
    [50, 0],
    [68, 2],
    [82, 6],
    [92, 12],
    [100, 22],
    [100, 100],
    [0, 100],
  ],
  wave: [
    [0, 12],
    [16, 0],
    [33, 14],
    [50, 4],
    [67, 16],
    [84, 2],
    [100, 14],
    [100, 100],
    [0, 100],
  ],
};

const SIDE: Record<Exclude<ReportImageMask, 'straight'>, Point[]> = {
  diagonal: [
    [22, 0],
    [100, 0],
    [100, 100],
    [0, 100],
  ],
  peak: [
    [18, 0],
    [100, 0],
    [100, 100],
    [18, 100],
    [0, 50],
  ],
  arch: [
    [24, 0],
    [100, 0],
    [100, 100],
    [24, 100],
    [14, 86],
    [6, 68],
    [2, 50],
    [6, 32],
    [14, 14],
  ],
  wave: [
    [20, 0],
    [100, 0],
    [100, 100],
    [12, 100],
    [22, 82],
    [8, 64],
    [20, 46],
    [6, 28],
    [18, 12],
  ],
};

const PANEL: Record<Exclude<ReportImageMask, 'straight'>, Point[]> = {
  diagonal: [
    [0, 18],
    [100, 0],
    [100, 82],
    [0, 100],
  ],
  peak: [
    [0, 22],
    [50, 0],
    [100, 22],
    [82, 100],
    [18, 100],
  ],
  arch: [
    [18, 28],
    [24, 14],
    [34, 6],
    [50, 2],
    [66, 6],
    [76, 14],
    [82, 28],
    [82, 100],
    [18, 100],
  ],
  wave: [
    [0, 16],
    [20, 4],
    [40, 18],
    [60, 6],
    [80, 16],
    [100, 8],
    [100, 92],
    [80, 100],
    [60, 86],
    [40, 98],
    [20, 84],
    [0, 94],
  ],
};

const EDGES: Record<ImageMaskEdge, Record<Exclude<ReportImageMask, 'straight'>, Point[]>> = {
  band: BAND,
  bleed: BLEED,
  side: SIDE,
  panel: PANEL,
};

export function reportImageMaskLabel(id: ReportImageMask): string {
  return MASK_LABELS[id];
}

export function isReportImageMask(value: unknown): value is ReportImageMask {
  return typeof value === 'string' && (REPORT_IMAGE_MASKS as readonly string[]).includes(value);
}

export function normalizeReportImageMask(value: unknown): ReportImageMask {
  return isReportImageMask(value) ? value : DEFAULT_REPORT_IMAGE_MASK;
}

/** Polygon points in a 0–100 box. Straight fills the box. */
export function imageMaskPoints(mask: ReportImageMask, edge: ImageMaskEdge): Point[] {
  const id = normalizeReportImageMask(mask);
  if (id === 'straight') return FULL;
  return EDGES[edge][id];
}

/** CSS clip-path for a photo edge. Null when the edge stays rectangular. */
export function imageMaskClipPath(mask: ReportImageMask, edge: ImageMaskEdge): string | null {
  if (normalizeReportImageMask(mask) === 'straight') return null;
  const points = imageMaskPoints(mask, edge);
  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

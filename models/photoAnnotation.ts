/**
 * Markup drawn on top of a job photo.
 *
 * Every coordinate is stored as a fraction of the photo's own width and
 * height (0..1), so the same annotation lines up whether it is drawn on the
 * phone, shown as a thumbnail, or printed in the PDF at full resolution.
 * Stroke widths are fractions of the photo's shorter side for the same reason.
 */

export const ANNOTATION_VERSION = 1;

export type AnnotationPoint = { x: number; y: number };

/** Figma Field Proof · Photo markup swatches. */
export const ANNOTATION_COLORS = ['#FF5A36', '#FFB020', '#1FA84A', '#FFFFFF', '#121412'] as const;
export type AnnotationColor = (typeof ANNOTATION_COLORS)[number];

/** Older swatches remapped so saved markup still opens after the palette update. */
const LEGACY_ANNOTATION_COLORS: Record<string, AnnotationColor> = {
  '#FF3B30': '#FF5A36',
  '#FFD60A': '#FFB020',
  '#34C759': '#1FA84A',
  '#0A84FF': '#FF5A36',
};

/** Toolbar order matches Figma redesign: Arrow · Label · Measure · Highlight · Draw. */
export const ANNOTATION_TOOLS = ['arrow', 'callout', 'dimension', 'highlight', 'pen'] as const;
export type AnnotationTool = (typeof ANNOTATION_TOOLS)[number];

/** Highlight sub-modes in the redesign (circle / box / fill). */
export const HIGHLIGHT_MODES = ['circle', 'box', 'fill'] as const;
export type HighlightMode = (typeof HIGHLIGHT_MODES)[number];

/** How annotated photos are laid out in the editor and on the printed report. */
export const PHOTO_ANNOTATION_LAYOUTS = ['fullWidth', 'sideBySide'] as const;
export type PhotoAnnotationLayout = (typeof PHOTO_ANNOTATION_LAYOUTS)[number];

/** Default stroke thickness, as a fraction of the photo's shorter side. */
export const ANNOTATION_STROKE = 0.009;

/** Named sizes in the Colour & size sheet (Thin · Medium · Thick). */
export const ANNOTATION_STROKE_SIZES = {
  thin: 0.005,
  medium: 0.009,
  thick: 0.016,
} as const;
export type AnnotationStrokeSize = keyof typeof ANNOTATION_STROKE_SIZES;

/** Pin radius for numbered callouts, as a fraction of the photo's shorter side. */
export const ANNOTATION_CALLOUT_RADIUS = 0.028;

/** Semi-transparent fill for the Highlight · Fill tool. */
export const HIGHLIGHT_FILL_OPACITY = 0.35;

export type AnnotationShape =
  | { kind: 'pen'; color: AnnotationColor; width: number; points: AnnotationPoint[]; outline?: boolean }
  | { kind: 'arrow'; color: AnnotationColor; width: number; from: AnnotationPoint; to: AnnotationPoint; outline?: boolean }
  | { kind: 'circle'; color: AnnotationColor; width: number; from: AnnotationPoint; to: AnnotationPoint; outline?: boolean }
  | { kind: 'rect'; color: AnnotationColor; width: number; from: AnnotationPoint; to: AnnotationPoint; outline?: boolean }
  | { kind: 'highlight'; color: AnnotationColor; width: number; from: AnnotationPoint; to: AnnotationPoint; outline?: boolean }
  | {
      kind: 'callout';
      color: AnnotationColor;
      at: AnnotationPoint;
      note: string;
      /** Point on the photo the leader line points to. Missing on legacy marks. */
      anchor?: AnnotationPoint;
      outline?: boolean;
    }
  | {
      kind: 'dimension';
      color: AnnotationColor;
      width: number;
      from: AnnotationPoint;
      to: AnnotationPoint;
      label: string;
      outline?: boolean;
    };

export type AnnotationCallout = Extract<AnnotationShape, { kind: 'callout' }>;
export type AnnotationDimension = Extract<AnnotationShape, { kind: 'dimension' }>;

export type PhotoAnnotations = {
  version: typeof ANNOTATION_VERSION;
  shapes: AnnotationShape[];
};

export function isAnnotationCallout(shape: AnnotationShape): shape is AnnotationCallout {
  return shape.kind === 'callout';
}

export function isAnnotationDimension(shape: AnnotationShape): shape is AnnotationDimension {
  return shape.kind === 'dimension';
}

/** Callouts in drawing order, with the 1-based number shown on the pin and card. */
export function listCallouts(annotations: PhotoAnnotations | null | undefined): { number: number; shape: AnnotationCallout }[] {
  if (!annotations) return [];
  const items: { number: number; shape: AnnotationCallout }[] = [];
  for (const shape of annotations.shapes) {
    if (!isAnnotationCallout(shape)) continue;
    items.push({ number: items.length + 1, shape });
  }
  return items;
}

/** Caption suggestion from label notes — used by the Save sheet. */
export function captionFromAnnotations(annotations: PhotoAnnotations | null | undefined): string {
  if (!annotations) return '';
  const notes = annotations.shapes
    .filter(isAnnotationCallout)
    .map((shape) => shape.note.trim())
    .filter(Boolean);
  return notes.join(', ');
}

export function normalizePhotoAnnotationLayout(value: unknown): PhotoAnnotationLayout {
  return value === 'sideBySide' ? 'sideBySide' : 'fullWidth';
}

export function emptyAnnotations(): PhotoAnnotations {
  return { version: ANNOTATION_VERSION, shapes: [] };
}

export function hasAnnotations(annotations: PhotoAnnotations | null | undefined): annotations is PhotoAnnotations {
  return !!annotations && annotations.shapes.length > 0;
}

export function strokeSizeFromWidth(width: number): AnnotationStrokeSize {
  const thin = ANNOTATION_STROKE_SIZES.thin;
  const thick = ANNOTATION_STROKE_SIZES.thick;
  const midThin = (thin + ANNOTATION_STROKE_SIZES.medium) / 2;
  const midThick = (ANNOTATION_STROKE_SIZES.medium + thick) / 2;
  if (width <= midThin) return 'thin';
  if (width >= midThick) return 'thick';
  return 'medium';
}

function isPoint(value: unknown): value is AnnotationPoint {
  if (!value || typeof value !== 'object') return false;
  const point = value as Record<string, unknown>;
  return typeof point.x === 'number' && Number.isFinite(point.x) && typeof point.y === 'number' && Number.isFinite(point.y);
}

function normalizeColor(value: unknown): AnnotationColor | null {
  if (typeof value !== 'string') return null;
  if ((ANNOTATION_COLORS as readonly string[]).includes(value)) return value as AnnotationColor;
  return LEGACY_ANNOTATION_COLORS[value] ?? null;
}

function parseOutline(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function parseShape(value: unknown): AnnotationShape | null {
  if (!value || typeof value !== 'object') return null;
  const shape = value as Record<string, unknown>;
  const color = normalizeColor(shape.color);
  if (!color) return null;
  const width = typeof shape.width === 'number' && shape.width > 0 ? shape.width : ANNOTATION_STROKE;
  const outline = parseOutline(shape.outline);

  if (shape.kind === 'pen') {
    if (!Array.isArray(shape.points)) return null;
    const points = shape.points.filter(isPoint);
    if (points.length === 0) return null;
    return { kind: 'pen', color, width, points, ...(outline !== undefined ? { outline } : {}) };
  }

  if (
    shape.kind === 'arrow' ||
    shape.kind === 'circle' ||
    shape.kind === 'rect' ||
    shape.kind === 'highlight'
  ) {
    if (!isPoint(shape.from) || !isPoint(shape.to)) return null;
    return {
      kind: shape.kind,
      color,
      width,
      from: shape.from,
      to: shape.to,
      ...(outline !== undefined ? { outline } : {}),
    };
  }

  if (shape.kind === 'dimension') {
    if (!isPoint(shape.from) || !isPoint(shape.to)) return null;
    const label = typeof shape.label === 'string' ? shape.label.trim().slice(0, 40) : '';
    return {
      kind: 'dimension',
      color,
      width,
      from: shape.from,
      to: shape.to,
      label,
      ...(outline !== undefined ? { outline } : {}),
    };
  }

  if (shape.kind === 'callout') {
    if (!isPoint(shape.at)) return null;
    const note = typeof shape.note === 'string' ? shape.note.trim().slice(0, 280) : '';
    const anchor = isPoint(shape.anchor) ? shape.anchor : undefined;
    return {
      kind: 'callout',
      color,
      at: shape.at,
      note,
      ...(anchor ? { anchor } : {}),
      ...(outline !== undefined ? { outline } : {}),
    };
  }

  return null;
}

/** Reads annotations saved as JSON. Unknown or damaged input yields null rather than throwing. */
export function parsePhotoAnnotations(raw: string | null | undefined): PhotoAnnotations | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    if (!Array.isArray(record.shapes)) return null;
    const shapes = record.shapes.map(parseShape).filter((shape): shape is AnnotationShape => shape !== null);
    if (shapes.length === 0) return null;
    return { version: ANNOTATION_VERSION, shapes };
  } catch {
    return null;
  }
}

/** Accepts either the JSON string from SQLite or the already-parsed object from a backup manifest. */
export function coercePhotoAnnotations(value: unknown): PhotoAnnotations | null {
  if (value == null) return null;
  if (typeof value === 'string') return parsePhotoAnnotations(value);
  if (typeof value === 'object') {
    try {
      return parsePhotoAnnotations(JSON.stringify(value));
    } catch {
      return null;
    }
  }
  return null;
}

function serializeShape(shape: AnnotationShape): Record<string, unknown> {
  const outline = shape.outline === undefined ? {} : { outline: shape.outline };
  if (shape.kind === 'pen') {
    return {
      kind: 'pen',
      color: shape.color,
      width: round(shape.width, 5),
      points: shape.points.map(roundPoint),
      ...outline,
    };
  }
  if (shape.kind === 'callout') {
    return {
      kind: 'callout',
      color: shape.color,
      at: roundPoint(shape.at),
      note: shape.note.slice(0, 280),
      ...(shape.anchor ? { anchor: roundPoint(shape.anchor) } : {}),
      ...outline,
    };
  }
  if (shape.kind === 'dimension') {
    return {
      kind: 'dimension',
      color: shape.color,
      width: round(shape.width, 5),
      from: roundPoint(shape.from),
      to: roundPoint(shape.to),
      label: shape.label.slice(0, 40),
      ...outline,
    };
  }
  return {
    kind: shape.kind,
    color: shape.color,
    width: round(shape.width, 5),
    from: roundPoint(shape.from),
    to: roundPoint(shape.to),
    ...outline,
  };
}

/** JSON for storage. Returns null when there is nothing drawn so the column stays empty. */
export function serializePhotoAnnotations(annotations: PhotoAnnotations | null | undefined): string | null {
  if (!hasAnnotations(annotations)) return null;
  return JSON.stringify({
    version: ANNOTATION_VERSION,
    shapes: annotations.shapes.map(serializeShape),
  });
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function roundPoint(point: AnnotationPoint): AnnotationPoint {
  return { x: round(point.x, 4), y: round(point.y, 4) };
}

export function clampPoint(point: AnnotationPoint): AnnotationPoint {
  return { x: Math.min(1, Math.max(0, point.x)), y: Math.min(1, Math.max(0, point.y)) };
}

// ---------------------------------------------------------------------------
// Geometry → SVG. Shared by the in-app overlay and the printed report.
// ---------------------------------------------------------------------------

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/** Quadratic-smoothed path through the pen points, scaled to the given pixel size. */
export function penPathData(points: AnnotationPoint[], width: number, height: number): string {
  if (points.length === 0) return '';
  const px = points.map((point) => ({ x: point.x * width, y: point.y * height }));
  const first = px[0]!;
  if (px.length === 1) {
    // A tap leaves a dot: a zero-length line with round caps renders as a circle.
    return `M ${fmt(first.x)} ${fmt(first.y)} L ${fmt(first.x + 0.01)} ${fmt(first.y)}`;
  }
  let d = `M ${fmt(first.x)} ${fmt(first.y)}`;
  for (let i = 1; i < px.length - 1; i += 1) {
    const current = px[i]!;
    const next = px[i + 1]!;
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    d += ` Q ${fmt(current.x)} ${fmt(current.y)} ${fmt(midX)} ${fmt(midY)}`;
  }
  const last = px[px.length - 1]!;
  d += ` L ${fmt(last.x)} ${fmt(last.y)}`;
  return d;
}

export type ArrowGeometry = { shaft: string; head: string };

/** Shaft line plus a filled triangular head sized from the stroke width. */
export function arrowGeometry(
  from: AnnotationPoint,
  to: AnnotationPoint,
  width: number,
  height: number,
  strokePx: number
): ArrowGeometry {
  const x1 = from.x * width;
  const y1 = from.y * height;
  const x2 = to.x * width;
  const y2 = to.y * height;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const headLength = Math.max(strokePx * 3.2, 6);
  const headHalfWidth = headLength * 0.55;
  if (length < 0.5) {
    return { shaft: `M ${fmt(x1)} ${fmt(y1)} L ${fmt(x2)} ${fmt(y2)}`, head: '' };
  }
  const ux = dx / length;
  const uy = dy / length;
  // Stop the shaft short so it does not poke through the head's tip.
  const shaftEndX = x2 - ux * headLength * 0.6;
  const shaftEndY = y2 - uy * headLength * 0.6;
  const baseX = x2 - ux * headLength;
  const baseY = y2 - uy * headLength;
  const leftX = baseX - uy * headHalfWidth;
  const leftY = baseY + ux * headHalfWidth;
  const rightX = baseX + uy * headHalfWidth;
  const rightY = baseY - ux * headHalfWidth;
  return {
    shaft: `M ${fmt(x1)} ${fmt(y1)} L ${fmt(shaftEndX)} ${fmt(shaftEndY)}`,
    head: `M ${fmt(x2)} ${fmt(y2)} L ${fmt(leftX)} ${fmt(leftY)} L ${fmt(rightX)} ${fmt(rightY)} Z`,
  };
}

export type EllipseGeometry = { cx: number; cy: number; rx: number; ry: number };

/** Ellipse that fills the box dragged from `from` to `to`, scaled to pixels. */
export function ellipseGeometry(from: AnnotationPoint, to: AnnotationPoint, width: number, height: number): EllipseGeometry {
  const x1 = from.x * width;
  const y1 = from.y * height;
  const x2 = to.x * width;
  const y2 = to.y * height;
  return {
    cx: (x1 + x2) / 2,
    cy: (y1 + y2) / 2,
    rx: Math.max(Math.abs(x2 - x1) / 2, 1),
    ry: Math.max(Math.abs(y2 - y1) / 2, 1),
  };
}

export type RectGeometry = { x: number; y: number; width: number; height: number };

export function rectGeometry(from: AnnotationPoint, to: AnnotationPoint, width: number, height: number): RectGeometry {
  const x1 = from.x * width;
  const y1 = from.y * height;
  const x2 = to.x * width;
  const y2 = to.y * height;
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.max(Math.abs(x2 - x1), 1),
    height: Math.max(Math.abs(y2 - y1), 1),
  };
}

/** Dimension line with T-bar end caps, in pixel space. */
export function dimensionGeometry(
  from: AnnotationPoint,
  to: AnnotationPoint,
  width: number,
  height: number,
  strokePx: number
): { line: string; capA: string; capB: string; midX: number; midY: number } {
  const x1 = from.x * width;
  const y1 = from.y * height;
  const x2 = to.x * width;
  const y2 = to.y * height;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const cap = Math.max(strokePx * 2.4, 8);
  const px = -uy * cap;
  const py = ux * cap;
  return {
    line: `M ${fmt(x1)} ${fmt(y1)} L ${fmt(x2)} ${fmt(y2)}`,
    capA: `M ${fmt(x1 + px)} ${fmt(y1 + py)} L ${fmt(x1 - px)} ${fmt(y1 - py)}`,
    capB: `M ${fmt(x2 + px)} ${fmt(y2 + py)} L ${fmt(x2 - px)} ${fmt(y2 - py)}`,
    midX: (x1 + x2) / 2,
    midY: (y1 + y2) / 2,
  };
}

export function strokeWidthPx(shape: { width: number }, width: number, height: number): number {
  return Math.max(shape.width * Math.min(width, height), 1);
}

export function calloutRadiusPx(width: number, height: number): number {
  return Math.max(ANNOTATION_CALLOUT_RADIUS * Math.min(width, height), 8);
}

/** Label/stroke contrast for light marker fills (white / yellow need dark text). */
export function annotationLabelColor(color: AnnotationColor): '#121412' | '#FFFFFF' {
  return color === '#FFFFFF' || color === '#FFB020' ? '#121412' : '#FFFFFF';
}

/** Whether a shape should draw the white outdoor outline (default on for new marks). */
export function shapeHasOutline(shape: AnnotationShape): boolean {
  return shape.outline !== false;
}

function outlineStrokePx(strokePx: number): number {
  return strokePx + Math.max(strokePx * 0.9, 2.5);
}

function strokeAttrs(color: string, strokePx: number): string {
  return `stroke="${color}" stroke-width="${fmt(strokePx)}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
}

function pushStrokedPath(parts: string[], d: string, color: string, strokePx: number, outline: boolean) {
  if (!d) return;
  if (outline) parts.push(`<path d="${d}" ${strokeAttrs('#FFFFFF', outlineStrokePx(strokePx))} />`);
  parts.push(`<path d="${d}" ${strokeAttrs(color, strokePx)} />`);
}

function pushFilledPath(parts: string[], d: string, color: string, strokePx: number, outline: boolean) {
  if (!d) return;
  if (outline) {
    parts.push(
      `<path d="${d}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="${fmt(outlineStrokePx(strokePx))}" stroke-linejoin="round" />`
    );
  }
  parts.push(
    `<path d="${d}" fill="${color}" stroke="${color}" stroke-width="${fmt(strokePx * 0.5)}" stroke-linejoin="round" />`
  );
}

function estimateTextWidth(text: string, fontSize: number): number {
  return Math.max(text.length, 2) * fontSize * 0.52;
}

function pushLabelPill(
  parts: string[],
  opts: {
    text: string;
    color: AnnotationColor;
    cx: number;
    cy: number;
    fontSize: number;
    outline: boolean;
  }
) {
  const labelColor = annotationLabelColor(opts.color);
  const padX = opts.fontSize * 0.85;
  const padY = opts.fontSize * 0.55;
  const textWidth = estimateTextWidth(opts.text, opts.fontSize);
  const pillW = padX * 2 + textWidth;
  const pillH = opts.fontSize + padY * 2;
  const x = opts.cx - pillW / 2;
  const y = opts.cy - pillH / 2;
  const rx = pillH / 2;
  const stroke = opts.outline ? ` stroke="#FFFFFF" stroke-width="2"` : '';
  parts.push(
    `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(pillW)}" height="${fmt(pillH)}" rx="${fmt(rx)}" fill="${opts.color}"${stroke} />` +
      `<text x="${fmt(opts.cx)}" y="${fmt(opts.cy)}" text-anchor="middle" dominant-baseline="central" fill="${labelColor}" font-size="${fmt(opts.fontSize)}" font-family="-apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif" font-weight="600">${escapeXml(opts.text)}</text>`
  );
  return { x, y, width: pillW, height: pillH };
}

export type AnnotationSvgOptions = {
  /**
   * How the overlay fits its box. Use `xMidYMid slice` over an image shown
   * with `object-fit: cover`, and `xMidYMid meet` over `contain`.
   */
  preserveAspectRatio?: 'xMidYMid meet' | 'xMidYMid slice' | 'none';
  className?: string;
  /**
   * When set, the photo is drawn inside the same SVG as the marks. Print
   * WebViews (especially Android) often drop absolutely positioned overlays,
   * so baking photo + markup into one element keeps drawings in the PDF.
   */
  imageHref?: string;
  /** Accessible name when `imageHref` is set (the SVG becomes the photo). */
  ariaLabel?: string;
};

/**
 * SVG markup of the annotations in the photo's pixel space.
 *
 * Without `imageHref`, this is an overlay for an `<img>`. With `imageHref`,
 * the photo and marks share one SVG so print engines keep the drawings.
 */
export function annotationsToSvgMarkup(
  annotations: PhotoAnnotations | null | undefined,
  width: number,
  height: number,
  options: AnnotationSvgOptions = {}
): string {
  if (!hasAnnotations(annotations) || width <= 0 || height <= 0) return '';
  const preserve = options.preserveAspectRatio ?? 'xMidYMid meet';
  const classAttr = options.className ? ` class="${options.className}"` : '';
  const parts: string[] = [];
  if (options.imageHref) {
    // href + xlink:href covers Chromium print WebViews and older SVG parsers.
    const href = options.imageHref.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    parts.push(
      `<image href="${href}" xlink:href="${href}" width="${fmt(width)}" height="${fmt(height)}" preserveAspectRatio="none" />`
    );
  }

  const fontSize = Math.max(Math.min(width, height) * 0.026, 12);

  for (const shape of annotations.shapes) {
    const outline = shapeHasOutline(shape);

    if (shape.kind === 'callout') {
      const note = shape.note.trim() || 'Note';
      const cx = shape.at.x * width;
      const cy = shape.at.y * height;
      if (shape.anchor) {
        const ax = shape.anchor.x * width;
        const ay = shape.anchor.y * height;
        const leader = `M ${fmt(cx)} ${fmt(cy)} L ${fmt(ax)} ${fmt(ay)}`;
        const strokePx = Math.max(fontSize * 0.12, 1.5);
        pushStrokedPath(parts, leader, shape.color, strokePx, outline);
        const r = Math.max(fontSize * 0.28, 3);
        if (outline) {
          parts.push(
            `<circle cx="${fmt(ax)}" cy="${fmt(ay)}" r="${fmt(r + 1.5)}" fill="#FFFFFF" />`
          );
        }
        parts.push(`<circle cx="${fmt(ax)}" cy="${fmt(ay)}" r="${fmt(r)}" fill="${shape.color}" />`);
      }
      pushLabelPill(parts, { text: note, color: shape.color, cx, cy, fontSize, outline });
      continue;
    }

    if (shape.kind === 'dimension') {
      const strokePx = strokeWidthPx(shape, width, height);
      const dim = dimensionGeometry(shape.from, shape.to, width, height, strokePx);
      pushStrokedPath(parts, dim.line, shape.color, strokePx, outline);
      pushStrokedPath(parts, dim.capA, shape.color, strokePx, outline);
      pushStrokedPath(parts, dim.capB, shape.color, strokePx, outline);
      const label = shape.label.trim() || '—';
      pushLabelPill(parts, {
        text: label,
        color: shape.color,
        cx: dim.midX,
        cy: dim.midY,
        fontSize: Math.max(fontSize * 0.95, 11),
        outline,
      });
      continue;
    }

    const strokePx = strokeWidthPx(shape, width, height);

    if (shape.kind === 'pen') {
      pushStrokedPath(parts, penPathData(shape.points, width, height), shape.color, strokePx, outline);
      continue;
    }

    if (shape.kind === 'arrow') {
      const arrow = arrowGeometry(shape.from, shape.to, width, height, strokePx);
      pushStrokedPath(parts, arrow.shaft, shape.color, strokePx, outline);
      pushFilledPath(parts, arrow.head, shape.color, strokePx, outline);
      continue;
    }

    if (shape.kind === 'circle') {
      const ellipse = ellipseGeometry(shape.from, shape.to, width, height);
      if (outline) {
        parts.push(
          `<ellipse cx="${fmt(ellipse.cx)}" cy="${fmt(ellipse.cy)}" rx="${fmt(ellipse.rx)}" ry="${fmt(ellipse.ry)}" ${strokeAttrs('#FFFFFF', outlineStrokePx(strokePx))} />`
        );
      }
      parts.push(
        `<ellipse cx="${fmt(ellipse.cx)}" cy="${fmt(ellipse.cy)}" rx="${fmt(ellipse.rx)}" ry="${fmt(ellipse.ry)}" ${strokeAttrs(shape.color, strokePx)} />`
      );
      continue;
    }

    if (shape.kind === 'rect') {
      const box = rectGeometry(shape.from, shape.to, width, height);
      if (outline) {
        parts.push(
          `<rect x="${fmt(box.x)}" y="${fmt(box.y)}" width="${fmt(box.width)}" height="${fmt(box.height)}" ${strokeAttrs('#FFFFFF', outlineStrokePx(strokePx))} />`
        );
      }
      parts.push(
        `<rect x="${fmt(box.x)}" y="${fmt(box.y)}" width="${fmt(box.width)}" height="${fmt(box.height)}" ${strokeAttrs(shape.color, strokePx)} />`
      );
      continue;
    }

    if (shape.kind === 'highlight') {
      const box = rectGeometry(shape.from, shape.to, width, height);
      const rx = Math.min(box.width, box.height) * 0.12;
      parts.push(
        `<rect x="${fmt(box.x)}" y="${fmt(box.y)}" width="${fmt(box.width)}" height="${fmt(box.height)}" rx="${fmt(rx)}" fill="${shape.color}" fill-opacity="${HIGHLIGHT_FILL_OPACITY}"${outline ? ` stroke="#FFFFFF" stroke-width="${fmt(Math.max(strokePx * 0.6, 1.5))}"` : ''} />`
      );
    }
  }

  const label = options.ariaLabel?.trim() ?? '';
  const labelled = Boolean(options.imageHref && label);
  const a11y = labelled
    ? ` role="img" aria-label="${label.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`
    : ' aria-hidden="true"';
  const title = labelled ? `<title>${label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>` : '';
  const ns = options.imageHref
    ? ' xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
    : ' xmlns="http://www.w3.org/2000/svg"';
  return `<svg${ns}${classAttr} viewBox="0 0 ${fmt(width)} ${fmt(height)}" preserveAspectRatio="${preserve}"${a11y}>${title}${parts.join('')}</svg>`;
}

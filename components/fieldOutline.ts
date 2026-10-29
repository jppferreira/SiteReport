/** Label inset, matching the control's horizontal text padding. */
export const FLOATING_LABEL_INSET = 16;

/** Outline stroke. The path is inset by half of this so the stroke stays inside the box. */
export const FIELD_STROKE_WIDTH = 1;

/** Distance from the box edge to the center of the outline stroke. */
export const FIELD_OUTLINE_INSET = FIELD_STROKE_WIDTH / 2;

/**
 * Extra SVG padding around the box. The stroke used to sit on the viewport
 * edge, and the bottom (and right) of that stroke was clipped away.
 */
export const FIELD_OUTLINE_PAD = 1;

/**
 * Clear space between the outline and the floated label, on each side.
 * The stroke stops this far before the label and starts again after it.
 */
export const FLOATING_NOTCH_GAP = 8;

/** Where the label sits once it has floated, far enough right to clear the corner. */
export function floatedLabelLeft(radius: number) {
  return Math.max(FLOATING_LABEL_INSET, radius + FLOATING_NOTCH_GAP);
}

/** Widest the floated label can be without running into the stroke on the right. */
export function floatedLabelMaxWidth(boxWidth: number, radius: number) {
  return Math.max(0, boxWidth - floatedLabelLeft(radius) - FLOATING_NOTCH_GAP - radius);
}

/**
 * Horizontal span of the missing top stroke. Progress 0 is a closed outline.
 * Progress 1 opens a gap around the floated label.
 */
export function notchBounds(radius: number, labelWidth: number, progress: number) {
  const left = floatedLabelLeft(radius);
  const width = Math.max(0, labelWidth);
  const fullStart = left - FLOATING_NOTCH_GAP;
  const fullEnd = left + width + FLOATING_NOTCH_GAP;
  const center = (fullStart + fullEnd) / 2;
  const span = width > 0 ? (fullEnd - fullStart) * Math.min(1, Math.max(0, progress)) : 0;
  const half = span / 2;
  return { start: center - half, end: center + half };
}

/**
 * Top of the floated label so its line box is centered on the top stroke.
 * `boxTop` is the field's top edge in the same coordinate space as the label.
 */
export function floatedLabelTop(boxTop: number, lineHeight: number) {
  return boxTop + FIELD_OUTLINE_INSET - lineHeight / 2;
}

/**
 * Rounded outline. Coordinates are shifted by `pad` so the stroke is not on
 * the SVG viewport edge. A notch on the top edge leaves the label sitting in
 * a break in the stroke.
 */
export function fieldOutlinePath(
  width: number,
  height: number,
  radius: number,
  notchStart: number,
  notchEnd: number,
  pad = 0,
): string {
  if (width <= 0 || height <= 0) return '';

  const inset = FIELD_OUTLINE_INSET;
  const left = pad + inset;
  const top = pad + inset;
  const right = pad + width - inset;
  const bottom = pad + height - inset;
  const r = Math.max(0, Math.min(radius - inset, (right - left) / 2, (bottom - top) / 2));
  const straightStart = left + r;
  const straightEnd = right - r;
  const gapStart = Math.max(straightStart, Math.min(notchStart + pad, straightEnd));
  const gapEnd = Math.max(gapStart, Math.min(notchEnd + pad, straightEnd));
  const open = gapEnd - gapStart > 0.5;

  const topRight = `A ${r} ${r} 0 0 1 ${right} ${top + r}`;
  const bottomRight = `A ${r} ${r} 0 0 1 ${right - r} ${bottom}`;
  const bottomLeft = `A ${r} ${r} 0 0 1 ${left} ${bottom - r}`;
  const topLeft = `A ${r} ${r} 0 0 1 ${left + r} ${top}`;

  if (!open) {
    return `M ${left + r} ${top} H ${right - r} ${topRight} V ${bottom - r} ${bottomRight} H ${left + r} ${bottomLeft} V ${top + r} ${topLeft} Z`;
  }

  return `M ${gapEnd} ${top} H ${right - r} ${topRight} V ${bottom - r} ${bottomRight} H ${left + r} ${bottomLeft} V ${top + r} ${topLeft} H ${gapStart}`;
}

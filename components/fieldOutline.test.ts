import {
  FIELD_OUTLINE_INSET,
  FIELD_OUTLINE_PAD,
  FIELD_STROKE_WIDTH,
  fieldOutlinePath,
  floatedLabelLeft,
  floatedLabelMaxWidth,
  floatedLabelTop,
  FLOATING_LABEL_INSET,
  FLOATING_NOTCH_GAP,
  notchBounds,
} from './fieldOutline';

describe('field outline notch', () => {
  const radius = 12;
  const labelWidth = 48;

  it('keeps a closed outline while the label is inside the field', () => {
    const { start, end } = notchBounds(radius, labelWidth, 0);
    expect(start).toBe(end);
    expect(fieldOutlinePath(280, 56, radius, start, end)).toContain('Z');
  });

  it('stops the stroke before the label and restarts after it', () => {
    const left = floatedLabelLeft(radius);
    const { start, end } = notchBounds(radius, labelWidth, 1);

    expect(left - start).toBe(FLOATING_NOTCH_GAP);
    expect(end - (left + labelWidth)).toBe(FLOATING_NOTCH_GAP);
    expect(start).toBeGreaterThanOrEqual(radius);

    const path = fieldOutlinePath(280, 56, radius, start, end);
    expect(path.startsWith(`M ${end}`)).toBe(true);
    expect(path.endsWith(`H ${start}`)).toBe(true);
    expect(path).not.toContain('Z');
  });

  it('does not cut the rounded corner when the requested gap starts too far left', () => {
    const path = fieldOutlinePath(280, 56, radius, 0, 80);
    expect(path.endsWith(`H ${radius}`)).toBe(true);
    expect(path).not.toContain('Z');
  });

  it('centers the floated label on the top stroke', () => {
    const lineHeight = 20;
    const boxTop = 16;
    const top = floatedLabelTop(boxTop, lineHeight);
    expect(top + lineHeight / 2).toBe(boxTop + FIELD_OUTLINE_INSET);
  });

  it('keeps the whole stroke inside the padded viewport, including the bottom edge', () => {
    const width = 280;
    const height = 56;
    const pad = FIELD_OUTLINE_PAD;
    const path = fieldOutlinePath(width, height, radius, 0, 0, pad);
    const svgHeight = height + pad * 2;
    const bottom = pad + height - FIELD_OUTLINE_INSET;

    expect(path).toContain(` ${bottom} `);
    expect(bottom + FIELD_STROKE_WIDTH / 2).toBeLessThan(svgHeight);
    expect(pad + FIELD_OUTLINE_INSET - FIELD_STROKE_WIDTH / 2).toBeGreaterThanOrEqual(0);
  });

  it('leaves the right corner intact for a long label', () => {
    const boxWidth = 200;
    const maxWidth = floatedLabelMaxWidth(boxWidth, radius);
    const { end } = notchBounds(radius, maxWidth, 1);
    expect(end).toBeLessThanOrEqual(boxWidth - radius);
    expect(maxWidth).toBeGreaterThan(0);
    expect(floatedLabelLeft(radius)).toBeGreaterThanOrEqual(FLOATING_LABEL_INSET);
  });
});

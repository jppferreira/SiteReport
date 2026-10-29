import { imageMaskClipPath, imageMaskPoints, normalizeReportImageMask } from './reportImageMask';

describe('report image masks', () => {
  it('keeps a straight edge unclipped', () => {
    expect(imageMaskClipPath('straight', 'band')).toBeNull();
    expect(normalizeReportImageMask('nope')).toBe('straight');
    expect(normalizeReportImageMask(null)).toBe('straight');
  });

  it('cuts a band on both edges and lets a bleed run to the bottom', () => {
    const band = imageMaskClipPath('diagonal', 'band');
    const bleed = imageMaskClipPath('diagonal', 'bleed');
    expect(band).toContain('0% 14%');
    expect(band).toContain('0% 100%');
    expect(bleed).toContain('100% 100%');
    expect(bleed).toContain('0% 100%');
    expect(bleed).not.toContain('86%');
  });

  it('uses a different cut for a side photo and a poster panel', () => {
    expect(imageMaskClipPath('peak', 'side')).toContain('0% 50%');
    expect(imageMaskClipPath('arch', 'panel')).toContain('18% 28%');
    expect(imageMaskPoints('wave', 'band').length).toBeGreaterThan(8);
  });
});

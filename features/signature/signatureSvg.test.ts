import { buildSignatureSvg, isSignatureEmpty, strokeToPathData } from './signatureSvg';

describe('strokeToPathData', () => {
  it('returns empty string for an empty stroke', () => {
    expect(strokeToPathData([])).toBe('');
  });

  it('draws a dot for a single point', () => {
    expect(strokeToPathData([{ x: 5, y: 5 }])).toBe('M5,5 L5,5');
  });

  it('starts and ends at the first and last point for a multi-point stroke', () => {
    const d = strokeToPathData([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ]);
    expect(d.startsWith('M0,0')).toBe(true);
    expect(d.endsWith('L20,0')).toBe(true);
  });
});

describe('isSignatureEmpty', () => {
  it('is empty when there are no strokes', () => {
    expect(isSignatureEmpty([])).toBe(true);
  });

  it('is empty when every stroke only has a single point (a tap, not a drag)', () => {
    expect(isSignatureEmpty([[{ x: 1, y: 1 }]])).toBe(true);
  });

  it('is not empty once a real stroke has been drawn', () => {
    expect(
      isSignatureEmpty([
        [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
      ])
    ).toBe(false);
  });
});

describe('buildSignatureSvg', () => {
  it('produces a valid svg document containing one path per non-empty stroke', () => {
    const svg = buildSignatureSvg(
      [
        [
          { x: 0, y: 0 },
          { x: 5, y: 5 },
        ],
        [{ x: 1, y: 1 }],
      ],
      200,
      100
    );

    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 200 100"');
    expect(svg.match(/<path/g)).toHaveLength(1);
  });
});

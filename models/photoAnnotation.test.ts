import {
  annotationsToSvgMarkup,
  coercePhotoAnnotations,
  emptyAnnotations,
  hasAnnotations,
  listCallouts,
  parsePhotoAnnotations,
  serializePhotoAnnotations,
} from './photoAnnotation';
import { fitContainRect } from '@/features/photos/fitContainRect';

describe('photo annotations', () => {
  it('round-trips pen, arrow, circle and callout shapes', () => {
    const annotations = {
      version: 1 as const,
      shapes: [
        { kind: 'pen' as const, color: '#FF5A36' as const, width: 0.009, points: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }] },
        { kind: 'arrow' as const, color: '#1FA84A' as const, width: 0.009, from: { x: 0.2, y: 0.2 }, to: { x: 0.8, y: 0.8 } },
        { kind: 'circle' as const, color: '#FFB020' as const, width: 0.009, from: { x: 0.4, y: 0.4 }, to: { x: 0.6, y: 0.7 } },
        { kind: 'callout' as const, color: '#121412' as const, at: { x: 0.5, y: 0.25 }, note: 'Crack by the sill' },
      ],
    };

    const raw = serializePhotoAnnotations(annotations);
    expect(raw).toContain('"pen"');
    expect(raw).toContain('Crack by the sill');
    expect(hasAnnotations(parsePhotoAnnotations(raw))).toBe(true);
    expect(coercePhotoAnnotations(annotations)?.shapes).toHaveLength(4);
  });

  it('maps legacy colours onto the Figma palette', () => {
    const parsed = parsePhotoAnnotations(
      JSON.stringify({
        version: 1,
        shapes: [{ kind: 'callout', color: '#FF3B30', at: { x: 0.2, y: 0.3 }, note: 'Legacy' }],
      })
    );
    expect(parsed?.shapes[0]).toMatchObject({ kind: 'callout', color: '#FF5A36', note: 'Legacy' });
  });

  it('stores nothing when the canvas is empty', () => {
    expect(serializePhotoAnnotations(emptyAnnotations())).toBeNull();
    expect(hasAnnotations(null)).toBe(false);
  });

  it('renders SVG markup for the PDF overlay', () => {
    const svg = annotationsToSvgMarkup(
      {
        version: 1,
        shapes: [
          { kind: 'arrow', color: '#FF5A36', width: 0.01, from: { x: 0.1, y: 0.1 }, to: { x: 0.9, y: 0.9 } },
          { kind: 'callout', color: '#1FA84A', at: { x: 0.2, y: 0.3 }, note: 'Pipe joint' },
        ],
      },
      1000,
      800,
      { className: 'photo-marks' }
    );
    expect(svg).toContain('class="photo-marks"');
    expect(svg).toContain('<path');
    expect(svg).toContain('<rect');
    expect(svg).toContain('Pipe joint');
  });

  it('bakes the photo into the SVG so print engines keep the drawings', () => {
    const svg = annotationsToSvgMarkup(
      {
        version: 1,
        shapes: [{ kind: 'callout', color: '#1FA84A', at: { x: 0.4, y: 0.5 }, note: 'Leak' }],
      },
      1200,
      1600,
      {
        className: 'photo-with-marks',
        preserveAspectRatio: 'xMidYMid meet',
        imageHref: 'data:image/jpeg;base64,abc',
        ariaLabel: 'Before photo',
      }
    );
    expect(svg).toContain('class="photo-with-marks"');
    expect(svg).toContain('<image href="data:image/jpeg;base64,abc"');
    expect(svg).toContain('xlink:href="data:image/jpeg;base64,abc"');
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(svg).toContain('aria-label="Before photo"');
    expect(svg).toContain('<rect');
  });

  it('lists numbered callout cards in order', () => {
    const callouts = listCallouts({
      version: 1,
      shapes: [
        { kind: 'pen', color: '#FFFFFF', width: 0.01, points: [{ x: 0, y: 0 }] },
        { kind: 'callout', color: '#FF5A36', at: { x: 0.1, y: 0.1 }, note: 'First' },
        { kind: 'callout', color: '#1FA84A', at: { x: 0.8, y: 0.8 }, note: 'Second' },
      ],
    });
    expect(callouts.map((item) => [item.number, item.shape.note])).toEqual([
      [1, 'First'],
      [2, 'Second'],
    ]);
  });

  it('exports recolored callout markers into PDF SVG markup', () => {
    const svg = annotationsToSvgMarkup(
      {
        version: 1,
        shapes: [
          { kind: 'callout', color: '#FFB020', at: { x: 0.2, y: 0.3 }, note: 'Recolored' },
          { kind: 'callout', color: '#FFFFFF', at: { x: 0.7, y: 0.6 }, note: 'White pin' },
        ],
      },
      1000,
      800
    );
    expect(svg).toContain('fill="#FFB020"');
    expect(svg).toContain('fill="#FFFFFF"');
    expect(svg).toContain('fill="#121412"');
    expect(svg).toContain('Recolored');
    expect(svg).toContain('White pin');
  });
});

describe('fitContainRect', () => {
  it('centers a landscape photo in a taller box', () => {
    const rect = fitContainRect(200, 400, 1000, 500);
    expect(rect).toEqual({ x: 0, y: 150, width: 200, height: 100 });
  });
});

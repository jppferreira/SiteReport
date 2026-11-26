import {
  autoPlaceLabel,
  expandBoundsForMove,
  handlesForShape,
  hitTestHandle,
  hitTestMoveTarget,
  hitTestShape,
  moveShape,
  resizeShape,
} from './photoMarkupHitTest';

describe('photoMarkupHitTest', () => {
  it('auto-places the label away from the pin', () => {
    const placed = autoPlaceLabel({ x: 0.7, y: 0.6 });
    expect(placed.x).toBeLessThan(0.7);
    expect(placed.y).toBeLessThan(0.6);
  });

  it('hits a callout pin, label, and leader line', () => {
    const shapes = [
      {
        kind: 'callout' as const,
        color: '#FF5A36' as const,
        at: { x: 0.2, y: 0.2 },
        anchor: { x: 0.5, y: 0.5 },
        note: 'Rotten',
      },
    ];
    expect(hitTestShape(shapes, { x: 0.5, y: 0.5 })).toBe(0);
    expect(hitTestShape(shapes, { x: 0.2, y: 0.2 })).toBe(0);
    expect(hitTestShape(shapes, { x: 0.35, y: 0.35 })).toBe(0);
    expect(hitTestShape(shapes, { x: 0.9, y: 0.9 })).toBeNull();
  });

  it('hits an arrow shaft and nearby offset (fat hit target)', () => {
    const shapes = [
      {
        kind: 'arrow' as const,
        color: '#FF5A36' as const,
        width: 0.01,
        from: { x: 0.1, y: 0.5 },
        to: { x: 0.9, y: 0.5 },
      },
    ];
    expect(hitTestShape(shapes, { x: 0.5, y: 0.5 })).toBe(0);
    expect(hitTestShape(shapes, { x: 0.5, y: 0.54 })).toBe(0);
    expect(hitTestShape(shapes, { x: 0.1, y: 0.5 })).toBe(0);
    expect(hitTestShape(shapes, { x: 0.5, y: 0.8 })).toBeNull();
  });

  it('exposes endpoint handles for arrows and hits them', () => {
    const arrow = {
      kind: 'arrow' as const,
      color: '#FF5A36' as const,
      width: 0.01,
      from: { x: 0.1, y: 0.2 },
      to: { x: 0.8, y: 0.2 },
    };
    expect(handlesForShape(arrow).map((h) => h.id)).toEqual(['from', 'to']);
    expect(hitTestHandle(arrow, { x: 0.1, y: 0.2 })).toBe('from');
    expect(hitTestHandle(arrow, { x: 0.8, y: 0.2 })).toBe('to');
  });

  it('gives thin marks a fat move target after selection', () => {
    const arrow = {
      kind: 'arrow' as const,
      color: '#FF5A36' as const,
      width: 0.01,
      from: { x: 0.2, y: 0.5 },
      to: { x: 0.8, y: 0.5 },
    };
    // Off the shaft but inside the expanded selection grab box.
    expect(hitTestMoveTarget(arrow, { x: 0.5, y: 0.53 })).toBe(true);
    expect(hitTestMoveTarget(arrow, { x: 0.5, y: 0.9 })).toBe(false);
    const expanded = expandBoundsForMove({ minX: 0.2, minY: 0.5, maxX: 0.8, maxY: 0.5 });
    expect(expanded.maxY - expanded.minY).toBeGreaterThanOrEqual(0.08);
  });

  it('moves and resizes shapes', () => {
    const arrow = {
      kind: 'arrow' as const,
      color: '#FF5A36' as const,
      width: 0.01,
      from: { x: 0.2, y: 0.2 },
      to: { x: 0.6, y: 0.2 },
    };
    const moved = moveShape(arrow, 0.1, 0.05);
    expect(moved.kind).toBe('arrow');
    if (moved.kind !== 'arrow') return;
    expect(moved.from.x).toBeCloseTo(0.3);
    expect(moved.from.y).toBeCloseTo(0.25);
    expect(moved.to.x).toBeCloseTo(0.7);
    expect(moved.to.y).toBeCloseTo(0.25);
    const resized = resizeShape(arrow, 'to', { x: 0.9, y: 0.4 });
    expect(resized.kind).toBe('arrow');
    if (resized.kind !== 'arrow') return;
    expect(resized.to).toEqual({ x: 0.9, y: 0.4 });
    expect(resized.from).toEqual(arrow.from);
  });
});

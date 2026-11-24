import {
  createOrientationTracker,
  detectLevelOrientation,
  ORIENTATION_HOLD_MS,
  stepOrientationTracker,
  UI_ROTATION_DEG,
  vialTiltDeg,
} from './levelOrientation';

const rad = (d: number) => (d * Math.PI) / 180;

describe('detectLevelOrientation', () => {
  it.each([
    [{ x: 0, y: 0, z: -1 }, 'flat'],
    [{ x: 0, y: 0, z: 1 }, 'flat'],
    [{ x: -1, y: 0, z: 0 }, 'edgeLeft'],
    [{ x: 1, y: 0, z: 0 }, 'edgeRight'],
    [{ x: 0, y: -1, z: 0 }, 'plumbBottom'],
    [{ x: 0, y: 1, z: 0 }, 'plumbTop'],
  ])('classifies %o as %s', (g, expected) => {
    expect(detectLevelOrientation(g.x, g.y, g.z)).toBe(expected);
  });

  it('ignores gravity magnitude', () => {
    expect(detectLevelOrientation(-9.81, 0.2, 0.1)).toBe('edgeLeft');
  });

  it('keeps flat sticky between 35° and 50° from horizontal', () => {
    const at42 = { x: Math.sin(rad(42)), y: 0, z: -Math.cos(rad(42)) };
    expect(detectLevelOrientation(at42.x, at42.y, at42.z, 'flat')).toBe('flat');
    expect(detectLevelOrientation(at42.x, at42.y, at42.z, 'edgeRight')).toBe('edgeRight');
    const at55 = { x: Math.sin(rad(55)), y: 0, z: -Math.cos(rad(55)) };
    expect(detectLevelOrientation(at55.x, at55.y, at55.z, 'flat')).toBe('edgeRight');
  });

  it('needs a clear margin to swap between a long and a short edge', () => {
    const nearDiagonal = { x: -0.68, y: -0.73, z: 0 };
    expect(detectLevelOrientation(nearDiagonal.x, nearDiagonal.y, nearDiagonal.z, 'edgeLeft')).toBe('edgeLeft');
    expect(detectLevelOrientation(nearDiagonal.x, nearDiagonal.y, nearDiagonal.z, 'plumbBottom')).toBe('plumbBottom');
  });

  it('rotates the UI so the readout reads upright', () => {
    expect(UI_ROTATION_DEG.edgeLeft).toBe(90);
    expect(UI_ROTATION_DEG.edgeRight).toBe(-90);
    expect(UI_ROTATION_DEG.plumbTop).toBe(180);
  });
});

describe('stepOrientationTracker', () => {
  const left = { x: -1, y: 0, z: 0 };
  const flat = { x: 0, y: 0, z: -1 };

  it('switches only after the new orientation holds for 250 ms', () => {
    let tracker = createOrientationTracker('flat');
    tracker = stepOrientationTracker(tracker, left, 1000);
    expect(tracker.current).toBe('flat');
    tracker = stepOrientationTracker(tracker, left, 1000 + ORIENTATION_HOLD_MS - 1);
    expect(tracker.current).toBe('flat');
    tracker = stepOrientationTracker(tracker, left, 1000 + ORIENTATION_HOLD_MS);
    expect(tracker.current).toBe('edgeLeft');
  });

  it('resets the timer when a brief wobble returns to the current mode', () => {
    let tracker = createOrientationTracker('flat');
    tracker = stepOrientationTracker(tracker, left, 0);
    tracker = stepOrientationTracker(tracker, flat, 100);
    tracker = stepOrientationTracker(tracker, left, 200);
    tracker = stepOrientationTracker(tracker, left, 400);
    expect(tracker.current).toBe('flat');
    tracker = stepOrientationTracker(tracker, left, 450);
    expect(tracker.current).toBe('edgeLeft');
  });
});

describe('vialTiltDeg', () => {
  it('is zero when the edge sits level', () => {
    expect(vialTiltDeg('edgeLeft', { x: -1, y: 0, z: 0 })).toBeCloseTo(0);
    expect(vialTiltDeg('edgeRight', { x: 1, y: 0, z: 0 })).toBeCloseTo(0);
    expect(vialTiltDeg('plumbBottom', { x: 0, y: -1, z: 0 })).toBeCloseTo(0);
    expect(vialTiltDeg('plumbTop', { x: 0, y: 1, z: 0 })).toBeCloseTo(0);
  });

  it('is positive when the right-hand end, as seen upright, is high', () => {
    // Left edge down: the phone bottom (−y) is the right-hand end. Gravity towards +y → right end high.
    expect(vialTiltDeg('edgeLeft', { x: -Math.cos(rad(2)), y: Math.sin(rad(2)), z: 0 })).toBeCloseTo(2);
    // Right edge down: the phone top (+y) is the right-hand end. Gravity towards −y → right end high.
    expect(vialTiltDeg('edgeRight', { x: Math.cos(rad(2)), y: -Math.sin(rad(2)), z: 0 })).toBeCloseTo(2);
    // Upright: gravity towards −x (left) → right end high.
    expect(vialTiltDeg('plumbBottom', { x: -Math.sin(rad(1.5)), y: -Math.cos(rad(1.5)), z: 0 })).toBeCloseTo(1.5);
    // Upside down: the phone's −x side is the user's right. Gravity towards +x → right end high.
    expect(vialTiltDeg('plumbTop', { x: Math.sin(rad(1.5)), y: Math.cos(rad(1.5)), z: 0 })).toBeCloseTo(1.5);
  });

  it('returns 0 for flat', () => {
    expect(vialTiltDeg('flat', { x: 0.1, y: 0.1, z: -1 })).toBe(0);
  });
});

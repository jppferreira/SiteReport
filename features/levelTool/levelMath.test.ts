import {
  BUBBLE_MAX_DEG,
  bubbleOffset,
  formatDegrees,
  readingFromAcceleration,
  smoothReading,
} from './levelMath';

describe('readingFromAcceleration', () => {
  it('reads flat face-up as level', () => {
    const reading = readingFromAcceleration(0, 0, -1);
    expect(reading.tiltDeg).toBeCloseTo(0, 5);
    expect(reading.isLevel).toBe(true);
  });

  it('reports right-side-down roll', () => {
    const reading = readingFromAcceleration(0.5, 0, -Math.sqrt(0.75));
    expect(reading.rollDeg).toBeGreaterThan(25);
    expect(reading.pitchDeg).toBeCloseTo(0, 1);
    expect(reading.isLevel).toBe(false);
  });

  it('reports top-edge-down pitch', () => {
    const reading = readingFromAcceleration(0, 0.5, -Math.sqrt(0.75));
    expect(reading.pitchDeg).toBeGreaterThan(25);
    expect(reading.rollDeg).toBeCloseTo(0, 1);
  });
});

describe('bubbleOffset', () => {
  it('moves the bubble toward the high side', () => {
    // Right side down → bubble to the left (negative x)
    const rightDown = bubbleOffset(10, 0, 100);
    expect(rightDown.x).toBeLessThan(0);
    expect(rightDown.y).toBeCloseTo(0, 5);

    // Top edge down → bubble toward bottom of screen (positive y in RN)
    const topDown = bubbleOffset(0, 10, 100);
    expect(topDown.y).toBeGreaterThan(0);
    expect(topDown.x).toBeCloseTo(0, 5);
  });

  it('keeps the bubble inside the vial at extreme tilt', () => {
    const offset = bubbleOffset(90, 90, 100, BUBBLE_MAX_DEG);
    expect(Math.hypot(offset.x, offset.y)).toBeLessThanOrEqual(100 + 1e-9);
  });
});

describe('formatDegrees', () => {
  it('formats signed angles', () => {
    expect(formatDegrees(1.24)).toBe('+1.2°');
    expect(formatDegrees(-0.56)).toBe('−0.6°');
    expect(formatDegrees(0.04)).toBe('0.0°');
    expect(formatDegrees(0)).toBe('0.0°');
  });
});

describe('smoothReading', () => {
  it('returns the first sample unchanged', () => {
    const next = readingFromAcceleration(0.1, 0, -1);
    expect(smoothReading(null, next)).toEqual(next);
  });

  it('blends toward the next sample', () => {
    const prev = readingFromAcceleration(0, 0, -1);
    const next = readingFromAcceleration(0.2, 0, -Math.sqrt(0.96));
    const smoothed = smoothReading(prev, next, 0.5);
    expect(smoothed.rollDeg).toBeGreaterThan(prev.rollDeg);
    expect(smoothed.rollDeg).toBeLessThan(next.rollDeg);
  });
});

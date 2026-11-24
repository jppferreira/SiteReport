/** Pure helpers for a phone spirit level from accelerometer readings (g). */

export const DEFAULT_LEVEL_THRESHOLD_DEG = 0.5;
/** Degrees of tilt that map to the edge of the bubble vial. */
export const BUBBLE_MAX_DEG = 15;

export type LevelReading = {
  /** Left/right tilt in degrees. Positive = right side down. */
  rollDeg: number;
  /** Forward/back tilt in degrees. Positive = top edge down. */
  pitchDeg: number;
  /** Combined tilt from horizontal. */
  tiltDeg: number;
  isLevel: boolean;
};

export type BubbleOffset = {
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Convert raw accelerometer g-forces into roll/pitch relative to horizontal. */
export function readingFromAcceleration(
  x: number,
  y: number,
  z: number,
  thresholdDeg = DEFAULT_LEVEL_THRESHOLD_DEG
): LevelReading {
  const rollDeg = (Math.atan2(x, Math.hypot(y, z)) * 180) / Math.PI;
  const pitchDeg = (Math.atan2(y, Math.hypot(x, z)) * 180) / Math.PI;
  const tiltDeg = Math.hypot(rollDeg, pitchDeg);
  return {
    rollDeg,
    pitchDeg,
    tiltDeg,
    isLevel: tiltDeg <= thresholdDeg,
  };
}

/**
 * Bubble offset inside a circular vial.
 * The bubble moves toward the high side (opposite gravity), matching a real spirit level.
 */
export function bubbleOffset(
  rollDeg: number,
  pitchDeg: number,
  maxOffset: number,
  maxDegrees = BUBBLE_MAX_DEG
): BubbleOffset {
  const nx = clamp(rollDeg / maxDegrees, -1, 1);
  const ny = clamp(pitchDeg / maxDegrees, -1, 1);
  const mag = Math.hypot(nx, ny);
  const scale = mag > 1 ? 1 / mag : 1;
  return {
    x: -nx * scale * maxOffset,
    y: ny * scale * maxOffset,
  };
}

/** Format a signed angle for the readout, e.g. "+1.2°". */
export function formatDegrees(degrees: number, digits = 1): string {
  const value = Number(degrees.toFixed(digits));
  if (value === 0) return `0.${'0'.repeat(digits)}°`;
  const sign = value > 0 ? '+' : '−';
  return `${sign}${Math.abs(value).toFixed(digits)}°`;
}

/** Low-pass filter for noisy accelerometer samples. */
export function smoothReading(previous: LevelReading | null, next: LevelReading, alpha = 0.18): LevelReading {
  if (!previous) return next;
  const rollDeg = previous.rollDeg + alpha * (next.rollDeg - previous.rollDeg);
  const pitchDeg = previous.pitchDeg + alpha * (next.pitchDeg - previous.pitchDeg);
  const tiltDeg = Math.hypot(rollDeg, pitchDeg);
  return {
    rollDeg,
    pitchDeg,
    tiltDeg,
    isLevel: tiltDeg <= DEFAULT_LEVEL_THRESHOLD_DEG,
  };
}

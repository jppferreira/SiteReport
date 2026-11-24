import type { LevelReading } from './levelMath';
import { DEFAULT_LEVEL_THRESHOLD_DEG } from './levelMath';
import { LEVEL_ORIENTATIONS, type Gravity, type LevelOrientation, vialTiltDeg } from './levelOrientation';

export type CalibrationOffset = { a: number; b: number };
/** Each face/edge is its own datum. Flat = roll/pitch; edges = tube tilt. */
export type CalibrationOffsets = Partial<Record<LevelOrientation, CalibrationOffset>>;

export function calibrationFor(o: LevelOrientation, reading: LevelReading, gravity: Gravity): CalibrationOffset {
  return o === 'flat'
    ? { a: reading.rollDeg, b: reading.pitchDeg }
    : { a: vialTiltDeg(o, gravity), b: 0 };
}

export function calibratedReading(
  o: LevelOrientation,
  raw: LevelReading,
  gravity: Gravity,
  offsets: CalibrationOffsets
): LevelReading & { angleDeg: number } {
  const zero = offsets[o] ?? { a: 0, b: 0 };
  if (o !== 'flat') {
    const angleDeg = vialTiltDeg(o, gravity) - zero.a;
    return { rollDeg: angleDeg, pitchDeg: 0, tiltDeg: Math.abs(angleDeg), angleDeg, isLevel: Math.abs(angleDeg) <= DEFAULT_LEVEL_THRESHOLD_DEG };
  }
  const rollDeg = raw.rollDeg - zero.a;
  const pitchDeg = raw.pitchDeg - zero.b;
  const tiltDeg = Math.hypot(rollDeg, pitchDeg);
  return { rollDeg, pitchDeg, tiltDeg, angleDeg: tiltDeg, isLevel: tiltDeg <= DEFAULT_LEVEL_THRESHOLD_DEG };
}

/** Ignore corrupt/stale storage instead of letting NaN poison sensor readings. */
export function parseCalibration(value: unknown): CalibrationOffsets {
  if (!value || typeof value !== 'object') return {};
  const result: CalibrationOffsets = {};
  for (const orientation of LEVEL_ORIENTATIONS) {
    const offset = (value as CalibrationOffsets)[orientation];
    if (offset && Number.isFinite(offset.a) && Number.isFinite(offset.b) && Math.abs(offset.a) <= 90 && Math.abs(offset.b) <= 90) {
      result[orientation] = { a: offset.a, b: offset.b };
    }
  }
  return result;
}

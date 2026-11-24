/**
 * Which side of the phone is on the surface, worked out from the gravity vector.
 *
 * Axis convention (after `normaliseGravity`): iOS / expo-sensors, units of g.
 *   face up -> z ≈ -1 · upright portrait -> y ≈ -1 · left long edge down -> x ≈ -1
 *
 * The AR screen stays portrait-locked; the level UI is rotated in code so the
 * readout is always upright for the person looking at it.
 */

export type Gravity = { x: number; y: number; z: number };

export type LevelOrientation =
  /** Lying on its back (or face down) — bullseye vial. */
  | 'flat'
  /** Left long edge on the surface — box level, UI rotated +90°. */
  | 'edgeLeft'
  /** Right long edge on the surface — box level, UI rotated −90°. */
  | 'edgeRight'
  /** Bottom short edge down (upright portrait) — plumb. */
  | 'plumbBottom'
  /** Top short edge down (upside-down portrait) — plumb, UI rotated 180°. */
  | 'plumbTop';

export const LEVEL_ORIENTATIONS: readonly LevelOrientation[] = [
  'flat',
  'edgeLeft',
  'edgeRight',
  'plumbBottom',
  'plumbTop',
];

/** Rotation applied to the level UI (degrees, clockwise) so it reads upright. */
export const UI_ROTATION_DEG: Record<LevelOrientation, number> = {
  flat: 0,
  plumbBottom: 0,
  plumbTop: 180,
  // Left edge down = phone turned anticlockwise, so turn the UI clockwise.
  edgeLeft: 90,
  edgeRight: -90,
};

/** Enter flat inside 35° of horizontal; only leave it past 50° (angular hysteresis). */
const FLAT_ENTER = Math.cos((35 * Math.PI) / 180);
const FLAT_EXIT = Math.cos((50 * Math.PI) / 180);
/** The other in-plane axis must win by this much before swapping long ↔ short edge. */
const EDGE_MARGIN = 0.15;
/** A new orientation must hold this long before the UI switches (time hysteresis). */
export const ORIENTATION_HOLD_MS = 250;

export function isEdgeOrientation(o: LevelOrientation): o is 'edgeLeft' | 'edgeRight' {
  return o === 'edgeLeft' || o === 'edgeRight';
}

export function isPlumbOrientation(o: LevelOrientation): o is 'plumbBottom' | 'plumbTop' {
  return o === 'plumbBottom' || o === 'plumbTop';
}

/**
 * Classify a gravity sample. Pass the current orientation so the boundaries are
 * sticky and the mode does not flicker when the phone sits near 45°.
 */
export function detectLevelOrientation(
  x: number,
  y: number,
  z: number,
  previous?: LevelOrientation
): LevelOrientation {
  const mag = Math.hypot(x, y, z) || 1;
  const nx = x / mag;
  const ny = y / mag;
  const az = Math.abs(z / mag);

  if (previous === 'flat' ? az > FLAT_EXIT : az > FLAT_ENTER) return 'flat';

  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  let useLong: boolean;
  if (previous && isEdgeOrientation(previous)) useLong = ax + EDGE_MARGIN > ay;
  else if (previous && isPlumbOrientation(previous)) useLong = ax > ay + EDGE_MARGIN;
  else useLong = ax >= ay;

  if (useLong) return nx < 0 ? 'edgeLeft' : 'edgeRight';
  return ny < 0 ? 'plumbBottom' : 'plumbTop';
}

export type OrientationTracker = {
  current: LevelOrientation;
  candidate: LevelOrientation | null;
  candidateSince: number;
};

export function createOrientationTracker(initial: LevelOrientation = 'flat'): OrientationTracker {
  return { current: initial, candidate: null, candidateSince: 0 };
}

/**
 * Feed one sample in; returns the next tracker state. `current` only changes once a
 * different orientation has been detected continuously for `holdMs`.
 */
export function stepOrientationTracker(
  tracker: OrientationTracker,
  gravity: Gravity,
  nowMs: number,
  holdMs = ORIENTATION_HOLD_MS
): OrientationTracker {
  const detected = detectLevelOrientation(gravity.x, gravity.y, gravity.z, tracker.current);
  if (detected === tracker.current) {
    return tracker.candidate === null ? tracker : { ...tracker, candidate: null, candidateSince: 0 };
  }
  if (tracker.candidate !== detected) {
    return { current: tracker.current, candidate: detected, candidateSince: nowMs };
  }
  if (nowMs - tracker.candidateSince >= holdMs) {
    return { current: detected, candidate: null, candidateSince: 0 };
  }
  return tracker;
}

/**
 * Tilt along the tube vial for the edge and plumb orientations, in degrees.
 * Positive = the right-hand end (as the user sees it, UI upright) is high.
 * Returns 0 for flat — flat uses roll and pitch instead.
 */
export function vialTiltDeg(o: LevelOrientation, g: Gravity): number {
  const deg = (r: number) => (r * 180) / Math.PI;
  switch (o) {
    case 'edgeLeft':
      return deg(Math.atan2(g.y, -g.x));
    case 'edgeRight':
      return deg(Math.atan2(-g.y, g.x));
    case 'plumbBottom':
      return deg(Math.atan2(-g.x, -g.y));
    case 'plumbTop':
      return deg(Math.atan2(g.x, g.y));
    default:
      return 0;
  }
}

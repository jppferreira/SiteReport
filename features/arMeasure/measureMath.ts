/** Local Vec3 / Transform math — avoids importing @stewmore/expo-ar (which loads ExpoAr at module init). */

export type Vec3 = { x: number; y: number; z: number };
export type Point2 = { x: number; y: number };

/** Column-major 4×4 transform (same layout as expo-ar). */
export type Transform = number[] | Float32Array;

export function positionOf(t: Transform): Vec3 {
  return { x: t[12] ?? 0, y: t[13] ?? 0, z: t[14] ?? 0 };
}

/** Distance in metres between two world transforms (column-major 4×4). */
export function lengthMetersBetween(a: Transform, b: Transform): number {
  const pa = positionOf(a);
  const pb = positionOf(b);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z);
}

/** Midpoint in world space (for label placement helpers). */
export function midpoint(a: Vec3, b: Vec3): Vec3 {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

/**
 * Area of a planar-ish 3D polygon in m² (Newell's method), so a doorway
 * traced on a wall works as well as a floor. Needs at least 3 points.
 */
export function polygonAreaSquareMeters(points: Vec3[]): number {
  if (points.length < 3) return 0;
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    nx += (a.y - b.y) * (a.z + b.z);
    ny += (a.z - b.z) * (a.x + b.x);
    nz += (a.x - b.x) * (a.y + b.y);
  }
  return Math.hypot(nx, ny, nz) / 2;
}

/** Centroid of screen points, for the area label. */
export function centroid2(points: Point2[]): Point2 | null {
  if (points.length === 0) return null;
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/** Nearest candidate within `radius` px of the target, if any. */
export function nearestWithin<T extends Point2>(candidates: T[], target: Point2, radius: number): T | null {
  let best: T | null = null;
  let bestDistance = radius;
  for (const candidate of candidates) {
    const distance = Math.hypot(candidate.x - target.x, candidate.y - target.y);
    if (distance <= bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Screen-space straightening: when the line from `start` to `target` is within
 * `maxDeg` of horizontal or vertical, return the target moved onto that axis.
 */
export function alignToAxis(start: Point2, target: Point2, maxDeg = 4): { point: Point2; aligned: 'horizontal' | 'vertical' | null } {
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  if (Math.hypot(dx, dy) < 24) return { point: target, aligned: null };
  const angle = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
  if (angle <= maxDeg) return { point: { x: target.x, y: start.y }, aligned: 'horizontal' };
  if (angle >= 90 - maxDeg) return { point: { x: start.x, y: target.y }, aligned: 'vertical' };
  return { point: target, aligned: null };
}

/** Local Vec3 / Transform math — avoids importing @stewmore/expo-ar (which loads ExpoAr at module init). */

export type Vec3 = { x: number; y: number; z: number };

/** Column-major 4×4 transform (same layout as expo-ar). */
export type Transform = number[] | Float32Array;

function positionOf(t: Transform): Vec3 {
  return { x: t[12] ?? 0, y: t[13] ?? 0, z: t[14] ?? 0 };
}

/** Distance in meters between two world transforms (column-major 4×4). */
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

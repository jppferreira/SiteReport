/** Level readout units — degrees, % fall, or mm per metre (with a 1:N ratio). */

export type LevelUnit = 'deg' | 'pct' | 'mmPerM';

export const LEVEL_UNITS: readonly LevelUnit[] = ['deg', 'pct', 'mmPerM'];

export function normaliseLevelUnit(value: unknown): LevelUnit {
  return value === 'pct' || value === 'mmPerM' ? value : 'deg';
}

function slope(deg: number): number {
  return Math.tan((Math.abs(deg) * Math.PI) / 180);
}

/** Fall as a percentage (rise over run × 100). */
export function degToPercent(deg: number): number {
  return slope(deg) * 100;
}

/** Fall in millimetres per metre of run. */
export function degToMmPerM(deg: number): number {
  return slope(deg) * 1000;
}

/** Inverse of `degToMmPerM`, handy for target falls such as 1:40. */
export function mmPerMToDeg(mmPerM: number): number {
  return (Math.atan(Math.abs(mmPerM) / 1000) * 180) / Math.PI;
}

/** Big readout value, unsigned — the hint says which way to move. */
export function formatSlope(deg: number, unit: LevelUnit): string {
  if (unit === 'pct') return `${degToPercent(deg).toFixed(1)}%`;
  if (unit === 'mmPerM') return `${Math.round(degToMmPerM(deg))} mm/m`;
  return `${Math.abs(deg).toFixed(1)}°`;
}

/**
 * 1:N ratio for drainage and patio falls, e.g. 25 mm/m → "1:40".
 * Returns null when effectively level (no meaningful ratio).
 */
export function fallRatio(deg: number): number | null {
  const t = slope(deg);
  if (t < 0.0005) return null;
  return Math.round(1 / t);
}

export function formatRatio(deg: number): string | null {
  const n = fallRatio(deg);
  return n === null ? null : `1:${n}`;
}

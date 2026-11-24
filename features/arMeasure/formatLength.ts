import type { MeasureUnit } from '@/services/preferencesService';

/** Formats a length in meters for display using the user's unit preference. */
export function formatLength(meters: number, unit: MeasureUnit): string {
  if (!Number.isFinite(meters) || meters < 0) return unit === 'imperial' ? '0 in' : '0 cm';

  if (unit === 'imperial') {
    let totalInches = Math.round(meters * 39.37007874 * 10) / 10;
    let feet = Math.floor(totalInches / 12);
    let inches = Math.round((totalInches - feet * 12) * 10) / 10;
    if (inches >= 12) {
      feet += 1;
      inches = 0;
    }
    if (feet <= 0) return `${inches.toFixed(1)} in`;
    if (inches < 0.05) return `${feet} ft`;
    return `${feet} ft ${inches.toFixed(1)} in`;
  }

  if (meters < 1) return `${(meters * 100).toFixed(1)} cm`;
  return `${meters.toFixed(2)} m`;
}

/** Builds a photo caption from the formatted length and an optional label. */
export function measurementCaption(meters: number, unit: MeasureUnit, label: string): string {
  const length = formatLength(meters, unit);
  const trimmed = label.trim();
  return trimmed ? `${length} — ${trimmed}` : length;
}

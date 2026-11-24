/** Length / area formatting and parsing for the AR tape measure. */

import { normalizeMeasureUnit, type MeasureUnit } from '@/services/preferencesService';

export type { MeasureUnit };

export const MEASURE_UNITS: readonly MeasureUnit[] = ['m', 'cm', 'mm', 'ftIn'];

const M_PER_INCH = 0.0254;
const SQ_FT_PER_SQ_M = 10.7639104;

export const normaliseMeasureUnit = normalizeMeasureUnit;

export function isImperial(unit: MeasureUnit): boolean {
  return unit === 'ftIn';
}

/** Formats a length in metres, e.g. "0.76 m", "76.2 cm", "762 mm", "2 ft 6.0 in". */
export function formatLength(meters: number, unit: MeasureUnit): string {
  const value = Number.isFinite(meters) && meters > 0 ? meters : 0;
  switch (unit) {
    case 'cm':
      return `${(value * 100).toFixed(1)} cm`;
    case 'mm':
      return `${Math.round(value * 1000)} mm`;
    case 'ftIn': {
      const totalInches = Math.round((value / M_PER_INCH) * 10) / 10;
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
    default:
      return `${value.toFixed(2)} m`;
  }
}

/** Formats an area in m²: metric units show m², feet-and-inches shows ft². */
export function formatArea(squareMeters: number, unit: MeasureUnit): string {
  const value = Number.isFinite(squareMeters) && squareMeters > 0 ? squareMeters : 0;
  if (unit === 'ftIn') return `${(value * SQ_FT_PER_SQ_M).toFixed(1)} ft²`;
  return `${value.toFixed(2)} m²`;
}

/** Number in the unit's own scale, for editing (ft-in edits in inches). */
export function lengthToInput(meters: number, unit: MeasureUnit): string {
  switch (unit) {
    case 'cm':
      return (meters * 100).toFixed(1);
    case 'mm':
      return String(Math.round(meters * 1000));
    case 'ftIn':
      return formatLength(meters, 'ftIn');
    default:
      return meters.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  }
}

export function areaToInput(squareMeters: number, unit: MeasureUnit): string {
  return unit === 'ftIn' ? (squareMeters * SQ_FT_PER_SQ_M).toFixed(1) : squareMeters.toFixed(2);
}

const NUMBER = '(\\d+(?:[.,]\\d+)?)';

/**
 * Parses a typed length into metres. A bare number is read in `unit`; explicit
 * suffixes win: "2.04", "204 cm", "2040mm", "6' 8\"", "6 ft 8 in", "80in".
 */
export function parseLength(input: string, unit: MeasureUnit): number | null {
  const text = input.trim().toLowerCase().replace(/[’′]/g, "'").replace(/[”″]/g, '"');
  if (!text) return null;
  const num = (s: string | undefined) => Number((s ?? '').replace(',', '.'));

  const feetInches = new RegExp(`^${NUMBER}\\s*(?:'|ft|feet|foot)\\s*(?:${NUMBER}\\s*(?:"|in|inch|inches)?)?$`).exec(text);
  if (feetInches) {
    const meters = (num(feetInches[1]) * 12 + (feetInches[2] ? num(feetInches[2]) : 0)) * M_PER_INCH;
    return meters > 0 ? meters : null;
  }
  const withSuffix = new RegExp(`^${NUMBER}\\s*(mm|cm|m|"|in|inch|inches)?$`).exec(text);
  if (!withSuffix) return null;
  const value = num(withSuffix[1]);
  const suffix = withSuffix[2] ?? (unit === 'ftIn' ? 'in' : unit);
  const factor: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, '"': M_PER_INCH, in: M_PER_INCH, inch: M_PER_INCH, inches: M_PER_INCH };
  const meters = value * (factor[suffix] ?? 1);
  return Number.isFinite(meters) && meters > 0 ? meters : null;
}

/** Parses a typed area in m² (or ft² when the unit is feet and inches). */
export function parseArea(input: string, unit: MeasureUnit): number | null {
  const match = new RegExp(`^${NUMBER}\\s*(m²|m2|ft²|ft2|sq ?ft)?$`).exec(input.trim().toLowerCase());
  if (!match) return null;
  const value = Number((match[1] ?? '').replace(',', '.'));
  const suffix = match[2];
  const imperial = suffix ? suffix.startsWith('ft') || suffix.startsWith('sq') : unit === 'ftIn';
  const sqm = imperial ? value / SQ_FT_PER_SQ_M : value;
  return Number.isFinite(sqm) && sqm > 0 ? sqm : null;
}

/** Builds a photo caption from the formatted length and an optional label. */
export function measurementCaption(meters: number, unit: MeasureUnit, label: string): string {
  const length = formatLength(meters, unit);
  const trimmed = label.trim();
  return trimmed ? `${length} — ${trimmed}` : length;
}

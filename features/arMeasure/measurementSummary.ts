import { formatArea, formatLength, type MeasureUnit } from './formatLength';
import type { Measurement } from './measureSession';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function measurementName(m: Measurement, t: Translate): string {
  return m.name || t(m.kind === 'area' ? 'arTools.measure.defaultArea' : 'arTools.measure.defaultLine', { n: m.ordinal });
}

export function formatMeasurement(m: Measurement, unit: MeasureUnit): string {
  return m.kind === 'area' ? formatArea(m.value, unit) : formatLength(m.value, unit);
}

/** "Hall door opening — 0.76 × 2.04 m" style caption, plus an optional dimension table. */
export function buildMeasurementCaption(
  measurements: Measurement[],
  unit: MeasureUnit,
  t: Translate,
  { title, includeTable }: { title: string; includeTable: boolean }
): string {
  const lines = measurements.filter((m) => m.kind === 'line');
  const [first, second] = lines;
  const summary = first && second && lines.length === 2 && measurements.length <= 3
    ? `${formatLength(first.value, unit).replace(/ (m|cm|mm)$/, '')} × ${formatLength(second.value, unit)}`
    : measurements.slice(0, 2).map((m) => formatMeasurement(m, unit)).join(', ');
  const head = [title.trim(), summary].filter(Boolean).join(' — ');
  if (!includeTable || measurements.length === 0) return head;
  return `${head}\n${measurementTable(measurements, unit, t)}`;
}

/** One "Name: value" line per measurement — printed under the photo on the PDF. */
export function measurementTable(measurements: Measurement[], unit: MeasureUnit, t: Translate): string {
  return measurements.map((m) => `${measurementName(m, t)}: ${formatMeasurement(m, unit)}`).join('\n');
}

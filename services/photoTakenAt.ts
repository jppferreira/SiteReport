import { formatDateTime } from '@/utils/format';

const EXIF_DATE = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;
const OFFSET = /^[+-]\d{2}:\d{2}$/;

/**
 * The time printed on a report. EXIF is the camera clock. A camera shot with
 * no EXIF uses the moment the shutter returned, which is still before the
 * file is compressed and saved. Library photos with no EXIF stay blank —
 * the file's save time is not when the picture was taken.
 */
export function resolveTakenAt(input: {
  source: 'camera' | 'library';
  exif: unknown;
  capturedAt?: string | null;
}): string | null {
  const fromExif = takenAtFromExif(input.exif);
  if (fromExif) return fromExif;
  if (input.source === 'camera' && input.capturedAt) {
    const parsed = new Date(input.capturedAt);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}

export function takenAtFromExif(exif: unknown): string | null {
  if (!exif || typeof exif !== 'object') return null;
  const record = exif as Record<string, unknown>;
  const direct = readExifRecord(record);
  if (direct) return direct;
  for (const value of Object.values(record)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const nested = readExifRecord(value as Record<string, unknown>);
    if (nested) return nested;
  }
  return null;
}

export function formatTakenAt(value: string | null | undefined): string {
  if (!value) return '';
  return formatDateTime(value);
}

function readExifRecord(record: Record<string, unknown>): string | null {
  const offset = firstOffset(record);
  for (const [key, value] of Object.entries(record)) {
    const name = key.toLowerCase().replace(/[{}]/g, '');
    if (name !== 'datetimeoriginal' && name !== 'datetimedigitized' && name !== 'datetime') continue;
    const parsed = parseExifDate(value, offset);
    if (parsed) return parsed;
  }
  return null;
}

function firstOffset(record: Record<string, unknown>): string | null {
  for (const [key, value] of Object.entries(record)) {
    const name = key.toLowerCase();
    if (name !== 'offsettimeoriginal' && name !== 'offsettime' && name !== 'offsettimedigitized') continue;
    if (typeof value === 'string' && OFFSET.test(value.trim())) return value.trim();
  }
  return null;
}

function parseExifDate(value: unknown, offset: string | null): string | null {
  if (typeof value !== 'string') return null;
  const match = EXIF_DATE.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  const clock = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`;
  return offset ? `${clock}${offset}` : clock;
}

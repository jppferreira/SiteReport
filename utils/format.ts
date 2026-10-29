import { getLocale, t } from '@/i18n';

/**
 * Date-only values (`yyyy-MM-dd`) are calendar days, not UTC instants.
 * `new Date('2026-10-06')` is midnight UTC, which is the previous evening
 * anywhere west of Greenwich — so a job dated the 6th rendered as the 5th.
 */
function parseDisplayDate(iso: string): Date | null {
  const trimmed = iso.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Formats an ISO date string for display, e.g. "4 Oct 2026". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = parseDisplayDate(iso);
  if (!date) return '';
  return new Intl.DateTimeFormat(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

/** Formats an ISO date string relative to today when recent, e.g. "Today". */
export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = parseDisplayDate(iso);
  if (!date) return '';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfTarget.getTime()) / 86_400_000);

  if (diffDays === 0) return t('dates.today');
  if (diffDays === 1) return t('dates.yesterday');
  if (diffDays === -1) return t('dates.tomorrow');
  if (diffDays > 1 && diffDays < 7) return t('dates.daysAgo', { count: diffDays });

  return formatDate(iso);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = parseDisplayDate(iso);
  if (!date) return '';
  return new Intl.DateTimeFormat(getLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Formats bytes as a human readable file size, e.g. "2.4 MB". */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value < 10 && unitIndex > 0 ? 1 : 0;
  const formatted = value.toFixed(precision).replace(/\.0$/, '');
  return `${formatted} ${units[unitIndex]}`;
}

/** Returns an ISO yyyy-MM-dd for "today" in the device's local timezone. */
export function todayIsoDate(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

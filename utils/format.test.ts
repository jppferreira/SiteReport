import { getLocale, setLocale } from '@/i18n';

import { formatDate, formatFileSize, formatRelativeDate, pluralize, todayIsoDate } from './format';

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2 KB');
  });

  it('formats megabytes with one decimal below 10MB', () => {
    expect(formatFileSize(3.4 * 1024 * 1024)).toBe('3.4 MB');
  });

  it('treats zero or negative sizes as 0 KB', () => {
    expect(formatFileSize(0)).toBe('0 KB');
    expect(formatFileSize(-10)).toBe('0 KB');
  });
});

describe('pluralize', () => {
  it('uses the singular for exactly one', () => {
    expect(pluralize(1, 'photo')).toBe('photo');
  });

  it('uses the default plural otherwise', () => {
    expect(pluralize(0, 'photo')).toBe('photos');
    expect(pluralize(5, 'photo')).toBe('photos');
  });
});

describe('todayIsoDate', () => {
  it('returns a yyyy-MM-dd formatted string', () => {
    expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('calendar dates west of UTC', () => {
  afterEach(() => {
    setLocale('en-US');
  });

  it('keeps a date-only job date on that local calendar day', () => {
    setLocale('en-GB');
    const formatted = new Intl.DateTimeFormat(getLocale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(2026, 9, 6));
    expect(formatDate('2026-10-06')).toBe(formatted);
  });

  it('calls today "Today" when the stored value is a date-only string', () => {
    expect(formatRelativeDate(todayIsoDate())).toBe('Today');
  });
});

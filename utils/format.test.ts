import { formatFileSize, pluralize, todayIsoDate } from './format';

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

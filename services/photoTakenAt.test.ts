import { formatTakenAt, resolveTakenAt, takenAtFromExif } from './photoTakenAt';

describe('resolveTakenAt', () => {
  it('uses the camera EXIF time instead of the file save time', () => {
    const taken = resolveTakenAt({
      source: 'camera',
      exif: { DateTimeOriginal: '2026:10:04 14:30:00', modificationTime: 1_700_000_000_000 },
      capturedAt: '2026-10-23T18:00:00.000Z',
    });
    expect(taken).toBe('2026-10-04T14:30:00');
  });

  it('keeps the camera offset when EXIF has one', () => {
    expect(takenAtFromExif({ DateTimeOriginal: '2026:10:04 14:30:00', OffsetTimeOriginal: '+01:00' })).toBe(
      '2026-10-04T14:30:00+01:00'
    );
  });

  it('reads a nested EXIF block', () => {
    expect(takenAtFromExif({ '{Exif}': { DateTimeOriginal: '2026:06:01 09:05:00' } })).toBe('2026-06-01T09:05:00');
  });

  it('uses the shutter return time for a camera shot with no EXIF', () => {
    expect(
      resolveTakenAt({
        source: 'camera',
        exif: null,
        capturedAt: '2026-10-23T18:04:00.000Z',
      })
    ).toBe('2026-10-23T18:04:00.000Z');
  });

  it('leaves a library photo blank when it has no capture time', () => {
    expect(
      resolveTakenAt({
        source: 'library',
        exif: { modificationTime: 1_700_000_000_000 },
        capturedAt: '2026-10-23T18:04:00.000Z',
      })
    ).toBeNull();
  });

  it('formats a naive capture time without shifting the clock', () => {
    expect(formatTakenAt('2026-10-04T14:30:00')).toContain('14:30');
    expect(formatTakenAt('2026-10-04T14:30:00')).toContain('4 Oct 2026');
    expect(formatTakenAt(null)).toBe('');
  });
});

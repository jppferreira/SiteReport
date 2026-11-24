import { orphanBackupPath, toBackupPath } from './paths';

describe('toBackupPath', () => {
  it('reads a normal app file URI', () => {
    expect(toBackupPath('file:///data/user/0/com.tradesreport.app/files/sitereport/jobs/a/photos/b.jpg')).toBe(
      'jobs/a/photos/b.jpg'
    );
  });

  it('reads Expo Go double-encoded experience paths', () => {
    const uri =
      'file:///data/user/0/host.exp.exponent/files/ExperienceData/%2540anonymous%252Fsitereport-id/sitereport/jobs/job/photos/a.jpg';
    expect(toBackupPath(uri)).toBe('jobs/job/photos/a.jpg');
  });

  it('reads sitereport when only the slash is percent-encoded', () => {
    expect(toBackupPath('file:///files/sitereport%2Fjobs%2Fj1%2Fphotos%2Fa.jpg')).toBe('jobs/j1/photos/a.jpg');
  });

  it('keeps paths that are already relative', () => {
    expect(toBackupPath('jobs/job-1/photos/full.jpg')).toBe('jobs/job-1/photos/full.jpg');
    expect(toBackupPath('business/logo.png')).toBe('business/logo.png');
  });

  it('refuses paths with no sitereport folder', () => {
    expect(toBackupPath('file:///cache/ImageManipulator/xyz.jpg')).toBeNull();
  });
});

describe('orphanBackupPath', () => {
  it('builds a stable recovered path for cache files', () => {
    const first = orphanBackupPath('file:///cache/Print/report.pdf');
    const second = orphanBackupPath('file:///cache/Print/report.pdf');
    expect(first).toMatch(/^recovered\/[0-9a-f]+\/report\.pdf$/);
    expect(first).toBe(second);
  });
});

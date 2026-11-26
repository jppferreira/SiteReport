import { orphanBackupPath, resolveSitereportUri, toBackupPath } from './paths';

describe('resolveSitereportUri', () => {
  const docs = 'file:///var/mobile/Containers/Data/Application/NEW-UUID/Documents/';

  it('rewrites a stale iOS container absolute URI onto the current Documents root', () => {
    const stale =
      'file:///var/mobile/Containers/Data/Application/OLD-UUID/Documents/sitereport/jobs/kitchen-demo/photos/before-suite.jpg';
    expect(resolveSitereportUri(stale, docs)).toBe(
      `${docs}sitereport/jobs/kitchen-demo/photos/before-suite.jpg`
    );
  });

  it('resolves a relative backup path', () => {
    expect(resolveSitereportUri('jobs/a/photos/b.jpg', docs)).toBe(`${docs}sitereport/jobs/a/photos/b.jpg`);
  });

  it('leaves unrelated URIs alone', () => {
    expect(resolveSitereportUri('file:///cache/tmp.jpg', docs)).toBe('file:///cache/tmp.jpg');
  });
});

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

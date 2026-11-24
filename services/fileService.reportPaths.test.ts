import { nextReportArtifactName } from './fileService';

describe('nextReportArtifactName', () => {
  it('uses a timestamped name when the folder is empty', () => {
    expect(nextReportArtifactName('Job.pdf', new Set(), 1700000000000)).toBe('1700000000000-Job.pdf');
  });

  it('never reuses a name that already holds a saved report', () => {
    const existing = new Set(['1700000000000-Job.pdf']);
    expect(nextReportArtifactName('Job.pdf', existing, 1700000000000)).toBe('1700000000000-1-Job.pdf');
  });

  it('keeps bumping until the path is free', () => {
    const existing = new Set(['1700000000000-Job.pdf', '1700000000000-1-Job.pdf', '1700000000000-2-Job.pdf']);
    expect(nextReportArtifactName('Job.pdf', existing, 1700000000000)).toBe('1700000000000-3-Job.pdf');
  });
});

import { computeJobProgress, deriveJobStatus, nextRecommendedAction } from './jobProgress';

describe('computeJobProgress', () => {
  it('marks a brand new job as entirely not started except details', () => {
    const progress = computeJobProgress({
      job: { title: 'Bathroom repair' },
      photoCounts: { before: 0, after: 0 },
      hasWorkSummary: false,
      hasSignature: false,
      reportState: 'none',
    });

    expect(progress.sections.details).toBe('complete');
    expect(progress.sections.photos).toBe('not_started');
    expect(progress.sections.summary).toBe('not_started');
    expect(progress.sections.signature).toBe('not_started');
    expect(progress.sections.report).toBe('not_started');
    expect(progress.completedCount).toBe(1);
    expect(progress.totalCount).toBe(5);
  });

  it('treats photos as in progress until both before and after exist', () => {
    const onlyBefore = computeJobProgress({
      job: { title: 'Job' },
      photoCounts: { before: 2, after: 0 },
      hasWorkSummary: false,
      hasSignature: false,
      reportState: 'none',
    });
    expect(onlyBefore.sections.photos).toBe('in_progress');

    const both = computeJobProgress({
      job: { title: 'Job' },
      photoCounts: { before: 2, after: 1 },
      hasWorkSummary: false,
      hasSignature: false,
      reportState: 'none',
    });
    expect(both.sections.photos).toBe('complete');
  });

  it('reflects a fully complete job matching the "4 of 5" example when signature is skipped', () => {
    const progress = computeJobProgress({
      job: { title: 'Bathroom repair' },
      photoCounts: { before: 4, after: 6 },
      hasWorkSummary: true,
      hasSignature: false,
      reportState: 'fresh',
    });

    expect(progress.completedCount).toBe(4);
    expect(progress.sections.signature).toBe('not_started');
  });

  it('marks the report section in_progress when the job changed since the last report', () => {
    const progress = computeJobProgress({
      job: { title: 'Job' },
      photoCounts: { before: 1, after: 1 },
      hasWorkSummary: true,
      hasSignature: true,
      reportState: 'stale',
    });
    expect(progress.sections.report).toBe('in_progress');
    expect(progress.completedCount).toBe(4);
  });
});

describe('deriveJobStatus', () => {
  it('is draft when nothing has started', () => {
    const progress = computeJobProgress({
      job: { title: 'Job' },
      photoCounts: { before: 0, after: 0 },
      hasWorkSummary: false,
      hasSignature: false,
      reportState: 'none',
    });
    expect(deriveJobStatus(progress)).toBe('draft');
  });

  it('is in_progress once any section has started but no fresh report exists', () => {
    const progress = computeJobProgress({
      job: { title: 'Job' },
      photoCounts: { before: 1, after: 0 },
      hasWorkSummary: false,
      hasSignature: false,
      reportState: 'none',
    });
    expect(deriveJobStatus(progress)).toBe('in_progress');
  });

  it('is complete once a fresh report exists', () => {
    const progress = computeJobProgress({
      job: { title: 'Job' },
      photoCounts: { before: 1, after: 1 },
      hasWorkSummary: true,
      hasSignature: false,
      reportState: 'fresh',
    });
    expect(deriveJobStatus(progress)).toBe('complete');
  });
});

describe('nextRecommendedAction', () => {
  it('recommends adding photos first', () => {
    const progress = computeJobProgress({
      job: { title: 'Job' },
      photoCounts: { before: 0, after: 0 },
      hasWorkSummary: false,
      hasSignature: false,
      reportState: 'none',
    });
    expect(nextRecommendedAction(progress)).toEqual({ label: 'Add photos', target: 'photos' });
  });

  it('recommends previewing the report once everything else is done', () => {
    const progress = computeJobProgress({
      job: { title: 'Job' },
      photoCounts: { before: 1, after: 1 },
      hasWorkSummary: true,
      hasSignature: true,
      reportState: 'none',
    });
    expect(nextRecommendedAction(progress)).toEqual({ label: 'Preview report', target: 'report' });
  });
});

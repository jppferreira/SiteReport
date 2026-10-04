import { countDistinctReportedJobs, isReportGenerationAllowed } from './freeReportQuota';

describe('countDistinctReportedJobs', () => {
  it('counts each job once even if it has multiple report versions', () => {
    expect(countDistinctReportedJobs(['job-1', 'job-1', 'job-2'])).toBe(2);
  });

  it('is zero for no reports', () => {
    expect(countDistinctReportedJobs([])).toBe(0);
  });
});

describe('isReportGenerationAllowed', () => {
  it('always allows pro users', () => {
    expect(isReportGenerationAllowed('job-4', ['job-1', 'job-2', 'job-3'], true)).toBe(true);
  });

  it('allows regenerating a report for a job that already has one, even at the limit', () => {
    expect(isReportGenerationAllowed('job-1', ['job-1', 'job-2', 'job-3'], false, 3)).toBe(true);
  });

  it('blocks a new job once the free limit of distinct jobs is reached', () => {
    expect(isReportGenerationAllowed('job-4', ['job-1', 'job-2', 'job-3'], false, 3)).toBe(false);
  });

  it('allows a new job while under the free limit', () => {
    expect(isReportGenerationAllowed('job-2', ['job-1'], false, 3)).toBe(true);
  });
});

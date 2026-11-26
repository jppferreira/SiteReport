import {
  BUG_REPORT_EMAIL,
  BUG_REPORT_GITHUB,
  bugReportMailtoUrl,
  buildBugReportBody,
  contactSubject,
  deliverBugReport,
  githubNewIssueUrl,
  publicErrorSummary,
} from './bugReport';

const draft = {
  topic: 'bug' as const,
  whatHappened: 'The preview stayed blank',
  expected: 'A report preview',
  steps: 'Open a job, then Preview',
  appVersion: '1.0.0',
  platform: 'ios',
};

describe('buildBugReportBody', () => {
  it('includes the form fields and device context', () => {
    expect(buildBugReportBody(draft)).toBe(
      [
        'Topic: Bug',
        'What happened:\nThe preview stayed blank',
        'What I expected:\nA report preview',
        'Steps to reproduce:\nOpen a job, then Preview',
        'App version: 1.0.0\nPlatform: ios',
      ].join('\n\n')
    );
  });

  it('labels a feature request by topic and leaves out blank steps', () => {
    expect(
      buildBugReportBody({
        ...draft,
        topic: 'feature',
        whatHappened: 'Duplicate a finished report',
        expected: 'I repeat the same job each week',
        steps: '   ',
      })
    ).toBe(
      [
        'Topic: Feature',
        'Message:\nDuplicate a finished report',
        'Why it would help:\nI repeat the same job each week',
        'App version: 1.0.0\nPlatform: ios',
      ].join('\n\n')
    );
  });

  it('omits optional sections that are blank', () => {
    expect(
      buildBugReportBody({
        ...draft,
        expected: '   ',
        steps: '',
      })
    ).toBe(['Topic: Bug', 'What happened:\nThe preview stayed blank', 'App version: 1.0.0\nPlatform: ios'].join('\n\n'));
  });
});

describe('publicErrorSummary', () => {
  it('keeps the error name and message and drops file paths', () => {
    const error = new Error('Failed to read /var/mobile/Jobs/job-42/photo.jpg');
    error.name = 'ReportError';
    expect(publicErrorSummary(error)).toBe('ReportError: Failed to read [path]');
  });

  it('uses the name when there is no message', () => {
    expect(publicErrorSummary(new Error(''))).toBe('Error');
  });
});

describe('bugReportMailtoUrl', () => {
  it('targets the support inbox', () => {
    expect(bugReportMailtoUrl(draft).startsWith(`mailto:${BUG_REPORT_EMAIL}?`)).toBe(true);
    expect(bugReportMailtoUrl(draft)).toContain(encodeURIComponent(contactSubject('bug')));
  });
});

describe('githubNewIssueUrl', () => {
  it('points at the public new-issue form without embedding credentials', () => {
    const url = githubNewIssueUrl(draft);
    expect(url.startsWith(`https://github.com/${BUG_REPORT_GITHUB.owner}/${BUG_REPORT_GITHUB.repo}/issues/new?`)).toBe(
      true
    );
    expect(url.toLowerCase()).not.toContain('token');
    expect(url.toLowerCase()).not.toContain('bearer');
  });
});

describe('deliverBugReport', () => {
  it('opens the mail app and never calls authenticated GitHub APIs', async () => {
    const openUrl = jest.fn().mockResolvedValue(undefined);
    await expect(deliverBugReport(draft, openUrl)).resolves.toBe('mail');
    expect(openUrl).toHaveBeenCalledWith(bugReportMailtoUrl(draft));
  });

  it('throws when the mail app cannot be opened', async () => {
    const openUrl = jest.fn().mockRejectedValue(new Error('no mail'));
    await expect(deliverBugReport(draft, openUrl)).rejects.toThrow('Could not send the message.');
  });
});

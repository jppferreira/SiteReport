import {
  BUG_REPORT_EMAIL,
  BUG_REPORT_SUBJECT,
  buildBugReportBody,
  publicErrorSummary,
  sendBugReport,
} from './bugReport';

const draft = {
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
        'What happened:\nThe preview stayed blank',
        'What I expected:\nA report preview',
        'Steps to reproduce:\nOpen a job, then Preview',
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
    ).toBe(['What happened:\nThe preview stayed blank', 'App version: 1.0.0\nPlatform: ios'].join('\n\n'));
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

describe('sendBugReport', () => {
  function jsonResponse(payload: unknown) {
    return { json: async () => payload };
  }

  it('posts the report to the developer inbox and resolves when it is accepted', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ success: 'true' }));

    await sendBugReport(draft, fetchImpl as unknown as typeof fetch);

    expect(fetchImpl).toHaveBeenCalledWith(
      `https://formsubmit.co/ajax/${BUG_REPORT_EMAIL}`,
      expect.objectContaining({ method: 'POST' })
    );
    const request = fetchImpl.mock.calls[0][1] as { headers: Record<string, string>; body: string };
    expect(request.headers.Referer).toBe('https://tradereportapp.com/');
    const body = JSON.parse(request.body) as { _subject: string; _captcha: string; message: string };
    expect(body._subject).toBe(BUG_REPORT_SUBJECT);
    expect(body._captcha).toBe('false');
    expect(body.message).toContain('The preview stayed blank');
    expect(body.message).toContain('Platform: ios');
    expect(body.message).not.toContain('@');
  });

  it('rejects when delivery is not accepted', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ success: 'false' }));

    await expect(sendBugReport(draft, fetchImpl as unknown as typeof fetch)).rejects.toThrow(
      'Could not send the report.'
    );
  });

  it('rejects when the request fails', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'));

    await expect(sendBugReport(draft, fetchImpl as unknown as typeof fetch)).rejects.toThrow(
      'Could not send the report.'
    );
  });
});

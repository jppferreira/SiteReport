import {
  BUG_REPORT_EMAIL,
  BUG_REPORT_GITHUB,
  bugReportMailtoUrl,
  buildBugReportBody,
  contactSubject,
  deliverBugReport,
  githubBugReportToken,
  githubIssuesUrl,
  publicErrorSummary,
  sendBugReport,
} from './bugReport';

const draft = {
  topic: 'bug' as const,
  whatHappened: 'The preview stayed blank',
  expected: 'A report preview',
  steps: 'Open a job, then Preview',
  appVersion: '1.0.0',
  platform: 'ios',
};

const TEST_TOKEN = 'ghp_test_token_not_real';

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

describe('githubBugReportToken', () => {
  it('reads the token from expo extra', () => {
    expect(githubBugReportToken({ githubBugReportToken: '  abc  ' })).toBe('abc');
  });

  it('treats a missing token as empty', () => {
    expect(githubBugReportToken({})).toBe('');
  });
});

describe('sendBugReport', () => {
  function jsonResponse(payload: unknown, ok = true, status = 201) {
    return { ok, status, json: async () => payload };
  }

  it('posts an issue to the Trade Report GitHub repo', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ number: 42, html_url: 'https://github.com/x/y/issues/42' }));

    await sendBugReport(draft, fetchImpl as unknown as typeof fetch, TEST_TOKEN);

    expect(fetchImpl).toHaveBeenCalledWith(
      githubIssuesUrl(),
      expect.objectContaining({ method: 'POST' })
    );
    expect(githubIssuesUrl()).toContain(`${BUG_REPORT_GITHUB.owner}/${BUG_REPORT_GITHUB.repo}`);
    const request = fetchImpl.mock.calls[0][1] as { headers: Record<string, string>; body: string };
    expect(request.headers.Authorization).toBe(`Bearer ${TEST_TOKEN}`);
    const body = JSON.parse(request.body) as { title: string; body: string };
    expect(body.title).toBe(contactSubject('bug'));
    expect(body.body).toContain('The preview stayed blank');
    expect(body.body).toContain('Platform: ios');
    expect(body.body).not.toContain('@');
  });

  it('rejects when no token is configured', async () => {
    const fetchImpl = jest.fn();
    await expect(sendBugReport(draft, fetchImpl as unknown as typeof fetch, '')).rejects.toThrow(
      'Could not send the message.'
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('uses a support subject when the topic is support', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ number: 7 }));

    await sendBugReport({ ...draft, topic: 'support' }, fetchImpl as unknown as typeof fetch, TEST_TOKEN);

    const request = fetchImpl.mock.calls[0][1] as { body: string };
    const body = JSON.parse(request.body) as { title: string; body: string };
    expect(body.title).toBe(contactSubject('support'));
    expect(body.title).not.toBe(contactSubject('bug'));
    expect(body.body).toContain('Topic: Support');
  });

  it('rejects when delivery is not accepted', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ message: 'Bad credentials' }, false, 401));

    await expect(sendBugReport(draft, fetchImpl as unknown as typeof fetch, TEST_TOKEN)).rejects.toThrow(
      'Could not send the message.'
    );
  });

  it('rejects when the request fails', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'));

    await expect(sendBugReport(draft, fetchImpl as unknown as typeof fetch, TEST_TOKEN)).rejects.toThrow(
      'Could not send the message.'
    );
  });
});

describe('bugReportMailtoUrl', () => {
  it('addresses the developer and includes the report', () => {
    const url = bugReportMailtoUrl(draft);
    expect(url.startsWith(`mailto:${BUG_REPORT_EMAIL}?`)).toBe(true);
    expect(decodeURIComponent(url)).toContain('The preview stayed blank');
    expect(decodeURIComponent(url)).toContain(contactSubject('bug'));
  });
});

describe('deliverBugReport', () => {
  function jsonResponse(payload: unknown, ok = true) {
    return { ok, json: async () => payload };
  }

  it('does not open mail when GitHub accepts the report', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ number: 3 }));
    const openUrl = jest.fn();

    await expect(
      deliverBugReport(draft, openUrl, fetchImpl as unknown as typeof fetch, TEST_TOKEN)
    ).resolves.toBe('delivered');
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('opens the mail app when GitHub refuses the report', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'));
    const openUrl = jest.fn().mockResolvedValue(undefined);

    await expect(
      deliverBugReport(draft, openUrl, fetchImpl as unknown as typeof fetch, TEST_TOKEN)
    ).resolves.toBe('mail');
    expect(openUrl).toHaveBeenCalledWith(bugReportMailtoUrl(draft));
  });

  it('opens the mail app when no token is configured', async () => {
    const fetchImpl = jest.fn();
    const openUrl = jest.fn().mockResolvedValue(undefined);

    await expect(deliverBugReport(draft, openUrl, fetchImpl as unknown as typeof fetch, '')).resolves.toBe('mail');
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(openUrl).toHaveBeenCalledWith(bugReportMailtoUrl(draft));
  });

  it('rejects when the mail app cannot open', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'));
    const openUrl = jest.fn().mockRejectedValue(new Error('no mail app'));

    await expect(
      deliverBugReport(draft, openUrl, fetchImpl as unknown as typeof fetch, TEST_TOKEN)
    ).rejects.toThrow('Could not send the message.');
  });
});

import { t } from '@/i18n';
export const BUG_REPORT_EMAIL = 'hello@jppferreira.com';
export const BUG_REPORT_SUBJECT = t('bugReport.subject');

const DELIVERY_URL = `https://formsubmit.co/ajax/${BUG_REPORT_EMAIL}`;

export type BugReportDraft = {
  whatHappened: string;
  expected: string;
  steps: string;
  appVersion: string;
  platform: string;
};

export class BugReportDeliveryError extends Error {
  constructor() {
    super(t('bugReport.couldNotSend'));
    this.name = 'BugReportDeliveryError';
  }
}

/** Error name and message only. Paths can contain job identifiers, so they are removed. */
export function publicErrorSummary(error: unknown): string {
  const name = error instanceof Error && error.name ? error.name : t('bugReport.publicErrorFallbackName');
  const raw = error instanceof Error ? error.message : '';
  const message = raw
    .replace(/(?:[A-Za-z]:)?(?:\/|\\)[^\s)]+/g, '[path]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
  return message ? `${name}: ${message}` : name;
}

export function buildBugReportBody(draft: BugReportDraft): string {
  const sections = [`${t('bugReport.sectionWhatHappened')}\n${draft.whatHappened.trim()}`];
  const expected = draft.expected.trim();
  const steps = draft.steps.trim();
  if (expected) sections.push(`${t('bugReport.sectionExpected')}\n${expected}`);
  if (steps) sections.push(`${t('bugReport.sectionSteps')}\n${steps}`);
  sections.push(`${t('bugReport.sectionAppVersion')} ${draft.appVersion}\n${t('bugReport.sectionPlatform')} ${draft.platform}`);
  return sections.join('\n\n');
}

export async function sendBugReport(draft: BugReportDraft, fetchImpl: typeof fetch = fetch): Promise<void> {
  // The delivery service drops requests that have no page referrer. Browsers
  // ignore this header and attach their own; the native app has to set it.
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Referer: 'https://tradereportapp.com/',
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetchImpl(DELIVERY_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        _subject: BUG_REPORT_SUBJECT,
        _captcha: 'false',
        _template: 'box',
        message: buildBugReportBody(draft),
      }),
      signal: controller.signal,
    });

    let payload: { success?: unknown };
    try {
      payload = (await response.json()) as { success?: unknown };
    } catch {
      throw new BugReportDeliveryError();
    }

    if (payload.success !== true && payload.success !== 'true') {
      throw new BugReportDeliveryError();
    }
  } catch (error) {
    if (error instanceof BugReportDeliveryError) throw error;
    throw new BugReportDeliveryError();
  } finally {
    clearTimeout(timeout);
  }
}

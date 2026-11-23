import Constants from 'expo-constants';

import { t } from '@/i18n';

export const BUG_REPORT_EMAIL = 'hello@jppferreira.com';

/** Issues land on this repo so crash and contact reports show up in git. */
export const BUG_REPORT_GITHUB = {
  owner: 'jppferreira',
  repo: 'SiteReport',
} as const;

const MAILTO_BODY_LIMIT = 1200;

export const CONTACT_TOPICS = ['support', 'bug', 'feature', 'other'] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export function parseContactTopic(value: string | string[] | undefined): ContactTopic {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && (CONTACT_TOPICS as readonly string[]).includes(raw)) return raw as ContactTopic;
  return 'support';
}

export function contactSubject(topic: ContactTopic): string {
  switch (topic) {
    case 'support':
      return t('bugReport.subjectSupport');
    case 'feature':
      return t('bugReport.subjectFeature');
    case 'other':
      return t('bugReport.subjectOther');
    default:
      return t('bugReport.subject');
  }
}

export function contactTopicLabel(topic: ContactTopic): string {
  switch (topic) {
    case 'support':
      return t('bugReport.topicSupport');
    case 'feature':
      return t('bugReport.topicFeature');
    case 'other':
      return t('bugReport.topicOther');
    default:
      return t('bugReport.topicBug');
  }
}

export type BugReportDraft = {
  topic: ContactTopic;
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

function detailSectionLabel(topic: ContactTopic): string {
  switch (topic) {
    case 'bug':
      return t('bugReport.sectionExpected');
    case 'feature':
      return t('bugReport.sectionWhy');
    default:
      return t('bugReport.sectionDetails');
  }
}

export function buildBugReportBody(draft: BugReportDraft): string {
  const messageLabel = draft.topic === 'bug' ? t('bugReport.sectionWhatHappened') : t('bugReport.sectionMessage');
  const sections = [
    `${t('bugReport.sectionTopic')} ${contactTopicLabel(draft.topic)}`,
    `${messageLabel}\n${draft.whatHappened.trim()}`,
  ];
  const expected = draft.expected.trim();
  const steps = draft.steps.trim();
  if (expected) sections.push(`${detailSectionLabel(draft.topic)}\n${expected}`);
  if (steps) sections.push(`${t('bugReport.sectionSteps')}\n${steps}`);
  sections.push(`${t('bugReport.sectionAppVersion')} ${draft.appVersion}\n${t('bugReport.sectionPlatform')} ${draft.platform}`);
  return sections.join('\n\n');
}

/** Mail-app fallback when GitHub does not accept the message. Body is capped for mailto URL limits. */
export function bugReportMailtoUrl(draft: BugReportDraft): string {
  let body = buildBugReportBody(draft);
  if (body.length > MAILTO_BODY_LIMIT) body = `${body.slice(0, MAILTO_BODY_LIMIT - 1)}…`;
  const subject = encodeURIComponent(contactSubject(draft.topic));
  return `mailto:${BUG_REPORT_EMAIL}?subject=${subject}&body=${encodeURIComponent(body)}`;
}

export function githubBugReportToken(
  extra: { githubBugReportToken?: string } | undefined = Constants.expoConfig?.extra as
    | { githubBugReportToken?: string }
    | undefined,
): string {
  const fromExtra = extra?.githubBugReportToken?.trim() ?? '';
  if (fromExtra) return fromExtra;
  return (process.env.EXPO_PUBLIC_GITHUB_BUG_TOKEN ?? process.env.GITHUB_BUG_REPORT_TOKEN ?? '').trim();
}

export function githubIssuesUrl(): string {
  return `https://api.github.com/repos/${BUG_REPORT_GITHUB.owner}/${BUG_REPORT_GITHUB.repo}/issues`;
}

/**
 * Creates a GitHub issue on the Trade Report repo. Needs a fine-grained PAT with
 * Issues: Write on that repo, passed as GITHUB_BUG_REPORT_TOKEN (EAS / local env).
 */
export async function sendBugReport(
  draft: BugReportDraft,
  fetchImpl: typeof fetch = fetch,
  token: string = githubBugReportToken(),
): Promise<void> {
  if (!token) throw new BugReportDeliveryError();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetchImpl(githubIssuesUrl(), {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'TradeReport-App',
      },
      body: JSON.stringify({
        title: contactSubject(draft.topic).slice(0, 200),
        body: buildBugReportBody(draft),
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new BugReportDeliveryError();

    let payload: { html_url?: unknown; number?: unknown };
    try {
      payload = (await response.json()) as { html_url?: unknown; number?: unknown };
    } catch {
      throw new BugReportDeliveryError();
    }

    if (typeof payload.number !== 'number' && typeof payload.html_url !== 'string') {
      throw new BugReportDeliveryError();
    }
  } catch (error) {
    if (error instanceof BugReportDeliveryError) throw error;
    throw new BugReportDeliveryError();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Tries GitHub Issues first. If that fails, opens the device mail app with the
 * same text so the report can still be sent.
 */
export async function deliverBugReport(
  draft: BugReportDraft,
  openUrl: (url: string) => Promise<unknown>,
  fetchImpl: typeof fetch = fetch,
  token: string = githubBugReportToken(),
): Promise<'delivered' | 'mail'> {
  try {
    await sendBugReport(draft, fetchImpl, token);
    return 'delivered';
  } catch (error) {
    if (!(error instanceof BugReportDeliveryError)) throw new BugReportDeliveryError();
    try {
      await openUrl(bugReportMailtoUrl(draft));
      return 'mail';
    } catch {
      throw new BugReportDeliveryError();
    }
  }
}

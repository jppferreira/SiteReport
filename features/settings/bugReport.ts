import { t } from '@/i18n';

export const BUG_REPORT_EMAIL = 'hello@jppferreira.com';

/** Public repo for optional manual issue filing (no app-embedded credentials). */
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

/** Opens the device mail app with a prefilled report. Body is capped for mailto URL limits. */
export function bugReportMailtoUrl(draft: BugReportDraft): string {
  let body = buildBugReportBody(draft);
  if (body.length > MAILTO_BODY_LIMIT) body = `${body.slice(0, MAILTO_BODY_LIMIT - 1)}…`;
  const subject = encodeURIComponent(contactSubject(draft.topic));
  return `mailto:${BUG_REPORT_EMAIL}?subject=${subject}&body=${encodeURIComponent(body)}`;
}

/** Public “new issue” link for people who prefer GitHub (no embedded credentials). */
export function githubNewIssueUrl(draft: BugReportDraft): string {
  const title = encodeURIComponent(contactSubject(draft.topic).slice(0, 200));
  let body = buildBugReportBody(draft);
  if (body.length > 1800) body = `${body.slice(0, 1799)}…`;
  return `https://github.com/${BUG_REPORT_GITHUB.owner}/${BUG_REPORT_GITHUB.repo}/issues/new?title=${title}&body=${encodeURIComponent(body)}`;
}

/**
 * Delivers a bug/contact report without embedding secrets in the app binary.
 *
 * Uses the device mail app (mailto). Authenticated GitHub Issues API calls were
 * removed because Expo `extra` / `EXPO_PUBLIC_*` would ship any PAT to every install.
 */
export async function deliverBugReport(
  draft: BugReportDraft,
  openUrl: (url: string) => Promise<unknown>,
): Promise<'mail'> {
  try {
    await openUrl(bugReportMailtoUrl(draft));
    return 'mail';
  } catch {
    throw new BugReportDeliveryError();
  }
}

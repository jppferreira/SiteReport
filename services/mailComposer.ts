import * as MailComposer from 'expo-mail-composer';
import { Platform } from 'react-native';

import { shareFile } from '@/services/shareService';
import { t } from '@/i18n';
import { logger } from '@/utils/logger';

export type ComposeReportEmailInput = {
  /** Optional — empty opens the composer with no To: address. */
  recipientEmail?: string | null;
  subject: string;
  body: string;
  pdfUri: string;
  fileName: string;
};

export type ComposeReportEmailResult =
  | { outcome: 'sent' | 'cancelled' }
  | { outcome: 'shared'; message: string }
  | { outcome: 'unavailable'; message: string };

/**
 * Opens the system mail composer with the PDF attached when possible.
 * Falls back to the share sheet if mail is unavailable (common on simulators).
 */
export async function composeReportEmail(input: ComposeReportEmailInput): Promise<ComposeReportEmailResult> {
  try {
    const available = await MailComposer.isAvailableAsync();
    if (available) {
      const to = input.recipientEmail?.trim();
      const result = await MailComposer.composeAsync({
        recipients: to ? [to] : [],
        subject: input.subject,
        body: input.body,
        attachments: [input.pdfUri],
      });
      if (result.status === MailComposer.MailComposerStatus.CANCELLED) {
        return { outcome: 'cancelled' };
      }
      return { outcome: 'sent' };
    }
  } catch (error) {
    logger.warn('Mail composer failed', { error: String(error) });
  }

  if (Platform.OS === 'web') {
    return { outcome: 'unavailable', message: t('sendEmail.mailUnavailable') };
  }

  const shared = await shareFile(input.pdfUri, input.fileName);
  if (!shared) {
    return { outcome: 'unavailable', message: t('sendEmail.mailUnavailable') };
  }
  return { outcome: 'shared', message: t('sendEmail.sharedInstead') };
}

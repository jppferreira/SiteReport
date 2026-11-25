import { Platform, Share } from 'react-native';

import type { BusinessProfile, TradeDocument } from '@/models';
import { formatPence } from '@/models';
import { formatDate } from '@/utils/format';
import { t } from '@/i18n';

const REMINDER_PREFIX = 'doc-reminder:';

export type PaymentReminderContext = {
  document: TradeDocument;
  customerName: string | null;
  jobTitle: string | null;
  profile: BusinessProfile;
};

type ProfileWithStripe = BusinessProfile & { stripePaymentLink?: string | null };

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;

/**
 * Lazy-load expo-notifications. A top-level import pulls ExpoApplication via
 * getExpoPushTokenAsync and crashes Expo Go / incomplete native binaries.
 */
async function getNotifications(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web') return null;
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    notificationsModule = await import('expo-notifications');
    return notificationsModule;
  } catch {
    notificationsModule = null;
    return null;
  }
}

function stripePaymentLink(profile: BusinessProfile): string | null {
  const link = (profile as ProfileWithStripe).stripePaymentLink;
  return typeof link === 'string' && link.trim().length > 0 ? link.trim() : null;
}

export function configureDocumentReminderHandler(): void {
  if (Platform.OS === 'web') return;
  void getNotifications().then((Notifications) => {
    if (!Notifications) return;
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch {
      // Native notification module unavailable — ignore.
    }
  });
}

export async function requestDocumentReminderPermissions(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.status === 'granted';
  } catch {
    return false;
  }
}

function reminderId(documentId: string, suffix: string): string {
  return `${REMINDER_PREFIX}${documentId}:${suffix}`;
}

/** Pure helper for tests and scheduling: local 09:00 on date + dayOffset. */
export function atMorningLocal(isoDate: string, dayOffset: number): Date {
  const base = isoDate.includes('T') ? new Date(isoDate) : new Date(`${isoDate}T12:00:00`);
  const next = new Date(base);
  next.setDate(next.getDate() + dayOffset);
  next.setHours(9, 0, 0, 0);
  return next;
}

export async function cancelDocumentReminders(documentId: string): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  const suffixes = ['inv+3', 'inv+7', 'inv+14', 'quote-expiry'];
  await Promise.all(
    suffixes.map((suffix) =>
      Notifications.cancelScheduledNotificationAsync(reminderId(documentId, suffix)).catch(() => undefined)
    )
  );
}

export async function syncRemindersForDocument(
  doc: TradeDocument,
  meta?: { jobTitle?: string | null }
): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  try {
    await cancelDocumentReminders(doc.id);

    if (doc.kind === 'invoice' && (doc.status === 'unpaid' || doc.status === 'sent') && doc.dueDate) {
      const granted = await requestDocumentReminderPermissions();
      if (!granted) return;
      const label = doc.number ? `Invoice ${doc.number}` : t('documents.kindInvoice');
      const job = meta?.jobTitle ? ` (${meta.jobTitle})` : '';
      const offsets: { days: number; suffix: string }[] = [
        { days: 3, suffix: 'inv+3' },
        { days: 7, suffix: 'inv+7' },
        { days: 14, suffix: 'inv+14' },
      ];
      for (const { days, suffix } of offsets) {
        const when = atMorningLocal(doc.dueDate, days);
        if (when.getTime() <= Date.now()) continue;
        await Notifications.scheduleNotificationAsync({
          identifier: reminderId(doc.id, suffix),
          content: {
            title: t('reminders.invoiceTitle'),
            body: t('reminders.invoiceBody', { label, job, days }),
            data: { documentId: doc.id },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
        });
      }
      return;
    }

    if (doc.kind === 'quote' && doc.status === 'sent' && doc.validUntil) {
      const granted = await requestDocumentReminderPermissions();
      if (!granted) return;
      const when = atMorningLocal(doc.validUntil, -3);
      if (when.getTime() <= Date.now()) return;
      const label = doc.number ? `Quote ${doc.number}` : t('documents.kindQuote');
      await Notifications.scheduleNotificationAsync({
        identifier: reminderId(doc.id, 'quote-expiry'),
        content: {
          title: t('reminders.quoteTitle'),
          body: t('reminders.quoteBody', { label }),
          data: { documentId: doc.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
      });
    }
  } catch {
    // Scheduling failed (Expo Go limitations / missing native module).
  }
}

export async function sharePaymentReminder(ctx: PaymentReminderContext): Promise<'shared' | 'cancelled' | 'unavailable'> {
  const { document, customerName, jobTitle, profile } = ctx;
  if (document.kind !== 'invoice') return 'unavailable';

  const who = customerName?.trim() || t('reminders.genericCustomer');
  const business = profile.businessName?.trim() || t('reminders.genericBusiness');
  const lines = [
    t('reminders.shareGreeting', { who }),
    '',
    t('reminders.shareInvoiceLine', {
      number: document.number ?? '—',
      amount: document.totalPence != null ? formatPence(document.totalPence) : '—',
      due: document.dueDate ? formatDate(document.dueDate) : '—',
    }),
  ];
  if (jobTitle) lines.push(t('reminders.shareJobLine', { job: jobTitle }));
  const stripe = stripePaymentLink(profile);
  if (stripe) lines.push('', t('reminders.sharePayOnline', { url: stripe }));
  lines.push('', business);

  const message = lines.join('\n');
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text: message });
        return 'shared';
      } catch {
        return 'cancelled';
      }
    }
    return 'unavailable';
  }

  try {
    const result = await Share.share({ message });
    if (result.action === Share.dismissedAction) return 'cancelled';
    return 'shared';
  } catch {
    return 'unavailable';
  }
}

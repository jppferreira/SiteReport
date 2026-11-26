import { Platform, Share } from 'react-native';

import type { BusinessProfile, TradeDocument } from '@/models';
import { formatPence } from '@/models';
import { formatDate } from '@/utils/format';
import { t } from '@/i18n';
import { getPreferences } from '@/services/preferencesService';

const REMINDER_PREFIX = 'doc-reminder:';
export const INVOICE_OVERDUE_CATEGORY = 'invoice-overdue';
export const REMINDER_ACTION_SEND = 'send-reminder';
export const REMINDER_ACTION_MARK_PAID = 'mark-paid';
export const REMINDER_ACTION_SNOOZE = 'snooze-3d';

export type PaymentReminderContext = {
  document: TradeDocument;
  customerName: string | null;
  jobTitle: string | null;
  profile: BusinessProfile;
};

type ProfileWithStripe = BusinessProfile & { stripePaymentLink?: string | null };

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;
let categoriesReady = false;

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
  void getNotifications().then(async (Notifications) => {
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
      await ensureReminderCategories(Notifications);
    } catch {
      // Native notification module unavailable — ignore.
    }
  });
}

async function ensureReminderCategories(Notifications: NotificationsModule): Promise<void> {
  if (categoriesReady) return;
  try {
    await Notifications.setNotificationCategoryAsync(INVOICE_OVERDUE_CATEGORY, [
      {
        identifier: REMINDER_ACTION_SEND,
        buttonTitle: t('reminders.actionSendReminder'),
        options: { opensAppToForeground: true },
      },
      {
        identifier: REMINDER_ACTION_MARK_PAID,
        buttonTitle: t('reminders.actionMarkPaid'),
        options: { opensAppToForeground: true },
      },
      {
        identifier: REMINDER_ACTION_SNOOZE,
        buttonTitle: t('reminders.actionSnooze3Days'),
        options: { opensAppToForeground: false },
      },
    ]);
    categoriesReady = true;
  } catch {
    // Categories unsupported — notifications still schedule without actions.
  }
}

export type ReminderNotificationAction = {
  documentId: string;
  action: typeof REMINDER_ACTION_SEND | typeof REMINDER_ACTION_MARK_PAID | typeof REMINDER_ACTION_SNOOZE | 'default';
};

/** Subscribe to lock-screen / banner notification actions. Returns an unsubscribe fn. */
export async function subscribeReminderNotificationActions(
  onAction: (event: ReminderNotificationAction) => void
): Promise<() => void> {
  const Notifications = await getNotifications();
  if (!Notifications) return () => undefined;

  try {
    await ensureReminderCategories(Notifications);
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { documentId?: unknown };
      const documentId = typeof data?.documentId === 'string' ? data.documentId : null;
      if (!documentId) return;

      const raw = response.actionIdentifier;
      let action: ReminderNotificationAction['action'] = 'default';
      if (raw === REMINDER_ACTION_SEND) action = REMINDER_ACTION_SEND;
      else if (raw === REMINDER_ACTION_MARK_PAID) action = REMINDER_ACTION_MARK_PAID;
      else if (raw === REMINDER_ACTION_SNOOZE) action = REMINDER_ACTION_SNOOZE;

      onAction({ documentId, action });
    });
    return () => subscription.remove();
  } catch {
    return () => undefined;
  }
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
  const suffixes = ['inv+3', 'inv+7', 'inv+14', 'quote-expiry', 'snooze'];
  await Promise.all(
    suffixes.map((suffix) =>
      Notifications.cancelScheduledNotificationAsync(reminderId(documentId, suffix)).catch(() => undefined)
    )
  );
}

/** Snooze a single overdue chase for 3 days from now (lock-screen action). */
export async function snoozeInvoiceReminder(documentId: string, meta?: { label?: string }): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    const granted = await requestDocumentReminderPermissions();
    if (!granted) return;
    const when = new Date();
    when.setDate(when.getDate() + 3);
    when.setHours(9, 0, 0, 0);
    const label = meta?.label ?? t('documents.kindInvoice');
    await Notifications.cancelScheduledNotificationAsync(reminderId(documentId, 'snooze')).catch(() => undefined);
    await Notifications.scheduleNotificationAsync({
      identifier: reminderId(documentId, 'snooze'),
      content: {
        title: t('reminders.invoiceTitle'),
        body: t('reminders.invoiceBody', { label, job: '', days: 3 }),
        data: { documentId, actionHint: 'remind' },
        categoryIdentifier: INVOICE_OVERDUE_CATEGORY,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  } catch {
    // Ignore scheduling failures.
  }
}

export async function syncRemindersForDocument(
  doc: TradeDocument,
  meta?: { jobTitle?: string | null }
): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  try {
    await cancelDocumentReminders(doc.id);
    const prefs = await getPreferences();

    if (
      prefs.overdueRemindersEnabled &&
      doc.kind === 'invoice' &&
      (doc.status === 'unpaid' || doc.status === 'sent') &&
      doc.dueDate
    ) {
      const granted = await requestDocumentReminderPermissions();
      if (!granted) return;
      await ensureReminderCategories(Notifications);
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
            data: { documentId: doc.id, actionHint: 'remind' },
            categoryIdentifier: INVOICE_OVERDUE_CATEGORY,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
        });
      }
      return;
    }

    if (
      prefs.quoteExpiryRemindersEnabled &&
      doc.kind === 'quote' &&
      doc.status === 'sent' &&
      doc.validUntil
    ) {
      const granted = await requestDocumentReminderPermissions();
      if (!granted) return;
      const when = atMorningLocal(doc.validUntil, -2);
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

export function buildPaymentReminderMessage(ctx: PaymentReminderContext): string {
  const { document, customerName, jobTitle, profile } = ctx;
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
  return lines.join('\n');
}

export async function sharePaymentReminder(
  ctx: PaymentReminderContext,
  messageOverride?: string
): Promise<'shared' | 'cancelled' | 'unavailable'> {
  const { document } = ctx;
  if (document.kind !== 'invoice') return 'unavailable';

  const message = (messageOverride?.trim() || buildPaymentReminderMessage(ctx)).trim();
  if (!message) return 'unavailable';

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

import { router } from 'expo-router';
import React, { useEffect } from 'react';

import { documentsRepository } from '@/database';

/**
 * Sets foreground notification handling and routes lock-screen actions
 * (send reminder / mark paid / snooze) after the database is ready.
 */
export function DocumentRemindersHost() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void import('@/services/documentReminders')
      .then(async (mod) => {
        mod.configureDocumentReminderHandler();
        const remove = await mod.subscribeReminderNotificationActions(({ documentId, action }) => {
          if (action === mod.REMINDER_ACTION_SNOOZE) {
            void mod.snoozeInvoiceReminder(documentId);
            return;
          }
          if (action === mod.REMINDER_ACTION_MARK_PAID) {
            void documentsRepository.markPaid(documentId).catch(() => undefined);
          }
          router.push(`/document/${documentId}`);
        });
        if (cancelled) {
          remove();
          return;
        }
        unsubscribe = remove;
      })
      .catch(() => {
        // expo-notifications / ExpoApplication unavailable — app still runs.
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return null;
}

import React, { useEffect } from 'react';

/** Sets foreground notification handling after the database is ready. */
export function DocumentRemindersHost() {
  useEffect(() => {
    void import('@/services/documentReminders')
      .then(({ configureDocumentReminderHandler }) => {
        configureDocumentReminderHandler();
      })
      .catch(() => {
        // expo-notifications / ExpoApplication unavailable — app still runs.
      });
  }, []);
  return null;
}
/**
 * Ensures documentReminders can load without pulling expo-notifications
 * (which requires ExpoApplication and crashes Expo Go / incomplete native apps).
 */
jest.mock('expo-notifications', () => {
  throw new Error('expo-notifications must not be imported at module load');
});

import {
  atMorningLocal,
  cancelDocumentReminders,
  configureDocumentReminderHandler,
  sharePaymentReminder,
  syncRemindersForDocument,
} from './documentReminders';
import { DEFAULT_BUSINESS_PROFILE } from '@/models';

describe('documentReminders lazy notifications', () => {
  it('loads pure helpers without touching expo-notifications', async () => {
    const when = atMorningLocal('2026-11-20', 3);
    expect(when.getDate()).toBe(23);
    expect(when.getHours()).toBe(9);

    const result = await sharePaymentReminder({
      document: {
        id: 'd1',
        jobId: 'j1',
        kind: 'invoice',
        number: 'INV-0001',
        status: 'unpaid',
        title: null,
        totalPence: 10000,
        netPence: null,
        vatPence: null,
        dueDate: '2026-11-20',
        validUntil: null,
        sentAt: null,
        paidAt: null,
        acceptedAt: null,
        declinedAt: null,
        paidMethod: null,
        paidAmountPence: null,
        sourceDocumentId: null,
        attachedReportId: null,
        pricingSnapshotJson: null,
        reportId: null,
        localPdfUri: null,
        fileName: null,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      },
      customerName: 'Sarah',
      jobTitle: 'Kitchen',
      profile: { ...DEFAULT_BUSINESS_PROFILE, businessName: 'Acme' },
    });
    expect(['shared', 'cancelled', 'unavailable']).toContain(result);
  });

  it('configure + sync + cancel tolerate missing notifications module', async () => {
    expect(() => configureDocumentReminderHandler()).not.toThrow();
    await expect(cancelDocumentReminders('doc-1')).resolves.toBeUndefined();
    await expect(
      syncRemindersForDocument({
        id: 'd1',
        jobId: 'j1',
        kind: 'invoice',
        number: 'INV-0001',
        status: 'unpaid',
        title: null,
        totalPence: 10000,
        netPence: null,
        vatPence: null,
        dueDate: '2099-01-01',
        validUntil: null,
        sentAt: null,
        paidAt: null,
        acceptedAt: null,
        declinedAt: null,
        paidMethod: null,
        paidAmountPence: null,
        sourceDocumentId: null,
        attachedReportId: null,
        pricingSnapshotJson: null,
        reportId: null,
        localPdfUri: null,
        fileName: null,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      })
    ).resolves.toBeUndefined();
  });
});

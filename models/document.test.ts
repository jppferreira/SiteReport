import {
  documentStatusLabel,
  effectiveStatus,
  formatQuoteNumber,
  isOverdue,
  mapReportStatusToDocumentStatus,
} from './document';

describe('document helpers', () => {
  it('formats quote numbers', () => {
    expect(formatQuoteNumber(1)).toBe('QUO-0001');
    expect(formatQuoteNumber(99)).toBe('QUO-0099');
  });

  it('maps legacy report statuses into document statuses', () => {
    expect(mapReportStatusToDocumentStatus('active')).toBe('sent');
    expect(mapReportStatusToDocumentStatus('draft')).toBe('draft');
    expect(mapReportStatusToDocumentStatus('archived')).toBe('sent');
  });

  it('computes overdue only for unpaid invoices past due', () => {
    const base = {
      kind: 'invoice' as const,
      status: 'unpaid' as const,
      dueDate: '2026-01-01',
    };
    expect(isOverdue(base, '2026-02-01')).toBe(true);
    expect(isOverdue(base, '2025-12-01')).toBe(false);
    expect(isOverdue({ ...base, status: 'paid' }, '2026-02-01')).toBe(false);
    expect(isOverdue({ ...base, kind: 'quote' }, '2026-02-01')).toBe(false);
    expect(effectiveStatus(base, '2026-02-01')).toBe('overdue');
    expect(effectiveStatus({ ...base, status: 'paid' }, '2026-02-01')).toBe('paid');
  });

  it('labels statuses including overdue', () => {
    expect(documentStatusLabel('invoice', 'unpaid')).toBe('Unpaid');
    expect(documentStatusLabel('invoice', 'overdue')).toBe('Overdue');
    expect(documentStatusLabel('quote', 'accepted')).toBe('Accepted');
  });
});
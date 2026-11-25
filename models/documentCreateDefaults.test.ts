import { dueDateFromJob, formatInvoiceNumber, formatQuoteNumber, quoteValidUntilFromCreated } from '@/models';

describe('quote/invoice create defaults', () => {
  it('allocates INV / QUO numbers', () => {
    expect(formatInvoiceNumber(1)).toBe('INV-0001');
    expect(formatInvoiceNumber(43)).toBe('INV-0043');
    expect(formatQuoteNumber(18)).toBe('QUO-0018');
  });

  it('sets invoice due date from today + default days', () => {
    expect(dueDateFromJob('2026-11-24', 14)).toBe('2026-12-08');
  });

  it('sets quote validUntil from created + validity days', () => {
    const until = quoteValidUntilFromCreated('2026-11-24T10:00:00.000Z', 30);
    expect(until).toBe('2026-12-24');
  });
});

import {
  dueDateFromJob,
  formatInvoiceNumber,
  normalizeDocumentType,
  documentTypeRequiresPro,
} from './documentType';
import { pricingVatBreakdown } from './pricing';

describe('documentType helpers', () => {
  it('normalises unknown types to reference', () => {
    expect(normalizeDocumentType('invoice')).toBe('invoice');
    expect(normalizeDocumentType('nope')).toBe('reference');
  });

  it('gates quote and invoice behind Pro', () => {
    expect(documentTypeRequiresPro('reference')).toBe(false);
    expect(documentTypeRequiresPro('quote')).toBe(true);
    expect(documentTypeRequiresPro('invoice')).toBe(true);
  });

  it('formats invoice numbers and due dates', () => {
    expect(formatInvoiceNumber(1)).toBe('INV-0001');
    expect(formatInvoiceNumber(142)).toBe('INV-0142');
    expect(dueDateFromJob('2026-11-23', 14)).toBe('2026-12-07');
  });

  it('calculates VAT on price lines', () => {
    const breakdown = pricingVatBreakdown(
      [{ id: '1', description: 'Labour', category: 'labour', amount: '100' }],
      20
    );
    expect(breakdown).toEqual({ subtotalPence: 10000, vatPence: 2000, totalPence: 12000 });
  });
});

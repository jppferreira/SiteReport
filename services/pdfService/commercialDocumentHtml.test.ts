import { buildReportHtml } from './reportHtml';
import type { ReportHtmlInput } from './types';

function commercialSample(
  type: 'quote' | 'invoice',
  commercialTemplate: 'classic' | 'bold' | 'minimal' = 'classic'
): ReportHtmlInput {
  return {
    business: {
      name: 'JPF Building',
      logoDataUri: null,
      email: 'hello@jpf.example',
      phone: '0117 000 0000',
      website: null,
      address: '12 Trade Yard, Bristol',
      registrationNumber: '12345678',
      vatNumber: 'GB123456789',
      accentColor: '#17753b',
      footerMessage: null,
    },
    job: {
      title: 'Loft boarding and hatch',
      referenceNumber: null,
      jobDate: '2026-11-24',
      customerName: 'Ben Carter',
      address: '7 Elm Road\nBristol BS7 8PA',
      description: null,
      status: 'complete',
    },
    before: [],
    during: [],
    after: [],
    workCompleted: null,
    materials: null,
    recommendations: null,
    pricing: {
      enabled: true,
      lines: [
        { id: '1', description: 'Loft hatch & ladder · Supply and fit', category: 'materials', amount: '420' },
        { id: '2', description: 'Labour · 1 day', category: 'labour', amount: '300' },
        { id: '3', description: 'Insulation top-up', category: 'materials', amount: '420' },
      ],
    },
    documentType: type,
    commercialTemplate,
    invoice:
      type === 'invoice'
        ? {
            invoiceNumber: 'INV-0044',
            dueDate: '2026-12-08',
            dueDays: 14,
            bankName: 'Starling',
            sortCode: '20-00-00',
            accountNumber: '43214421',
            paymentTerms: null,
            stripePaymentLink: 'https://buy.stripe.com/7sI4gk2XaExample',
          }
        : null,
    quote:
      type === 'quote'
        ? {
            quoteNumber: 'QUO-0022',
            issuedAt: '2026-11-24T10:00:00.000Z',
            validUntil: '2026-12-24',
          }
        : null,
    signature: null,
    generatedAt: '2026-11-24T10:00:00.000Z',
    template: 'modern',
  };
}

describe('commercial quote/invoice templates', () => {
  it('renders the classic invoice commercial sheet instead of a report layout', () => {
    const html = buildReportHtml(commercialSample('invoice', 'classic'));
    expect(html).toContain('data-tier="commercial"');
    expect(html).toContain('data-template="commercial-classic"');
    expect(html).toContain('data-doc="invoice"');
    expect(html).toContain('INVOICE');
    expect(html).toContain('INV-0044');
    expect(html).toContain('JPF Building');
    expect(html).toContain('BILL TO');
    expect(html).toContain('Ben Carter');
    expect(html).toContain('Loft hatch &amp; ladder');
    expect(html).toContain('Supply and fit');
    expect(html).toContain('Subtotal');
    expect(html).toContain('VAT 20%');
    expect(html).toContain('Total due');
    expect(html).toContain('PAYMENT DETAILS');
    expect(html).toContain('Pay by card');
    expect(html).toContain('Enter £1,368.00 · reference INV-0044');
    expect(html).toContain('Or bank transfer: 20-00-00 · 43214421');
    expect(html).not.toContain('data-template="modern"');
    expect(html).not.toContain('section-before');
    expect(html).not.toContain('SERVICE &amp; COMPLETION');
  });

  it('renders the classic quote commercial sheet with validity', () => {
    const html = buildReportHtml(commercialSample('quote', 'classic'));
    expect(html).toContain('data-tier="commercial"');
    expect(html).toContain('data-template="commercial-classic"');
    expect(html).toContain('data-doc="quote"');
    expect(html).toContain('QUOTE');
    expect(html).toContain('QUO-0022');
    expect(html).toContain('PREPARED FOR');
    expect(html).toContain('Valid until');
    expect(html).toContain('HOW TO ACCEPT');
    expect(html).toContain('SCOPE &amp; TERMS');
    expect(html).not.toContain('Pay by card');
    expect(html).not.toContain('section-work');
  });

  it('renders bold and minimal template markers', () => {
    const bold = buildReportHtml(commercialSample('invoice', 'bold'));
    expect(bold).toContain('data-template="commercial-bold"');
    expect(bold).toContain('comm-line-zebra');
    expect(bold).toContain('INV-0044');

    const minimal = buildReportHtml(commercialSample('quote', 'minimal'));
    expect(minimal).toContain('data-template="commercial-minimal"');
    expect(minimal).toContain('QUO-0022');
    expect(minimal).toContain('All amounts in GBP');
  });
});

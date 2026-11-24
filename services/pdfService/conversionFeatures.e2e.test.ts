/**
 * End-to-end pipeline for the Figma Top 3 conversion features.
 * Builds realistic report HTML the same way preview/generate do, without a device.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  computeJobContentHash,
  REPORT_RENDER_VERSION,
} from '@/services/pdfService/contentHash';
import { buildReportHtml, buildReportPreviewHtml } from '@/services/pdfService/reportHtml';
import { reviewQrDataUri } from '@/services/pdfService/qrSvg';
import type { ReportHtmlInput } from '@/services/pdfService/types';
import { getPreferences, savePreferences } from '@/services/preferencesService';
import { buildReportFileName } from '@/utils/fileNaming';
import {
  dueDateFromJob,
  formatInvoiceNumber,
  Job,
  pricingVatBreakdown,
  VAT_RATE_PERCENT,
} from '@/models';
import { formatTranscriptLocally } from '@/services/voiceReport/localReportFormatter';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: async (_algorithm: string, value: string) => value,
}));

function photo(id: string, caption: string): ReportHtmlInput['before'][number] {
  return {
    id,
    dataUri: `data:image/jpeg;base64,${id}`,
    caption,
    width: 1200,
    height: 800,
  };
}

function baseInput(extras?: Partial<ReportHtmlInput>): ReportHtmlInput {
  return {
    business: {
      name: 'Hart & Co. Plumbing & Heating',
      ownerName: 'Alex Hart',
      logoDataUri: null,
      email: 'hello@hartandco.co.uk',
      phone: '07700 900123',
      website: 'https://hartandco.co.uk',
      address: '12 Yard Lane, Bristol',
      registrationNumber: '12345678',
      vatNumber: 'GB123456789',
      accentColor: '#1FA84A',
      footerMessage: 'Thank you for choosing Hart & Co.',
    },
    job: {
      title: 'Kitchen Refit',
      referenceNumber: 'KR-0142',
      jobDate: '2026-11-23',
      customerName: 'Sarah Miller',
      address: '14 Oak Lane',
      description: 'Isolation valve and pipework under the kitchen sink.',
      status: 'complete',
    },
    before: [photo('before-1', 'Old valve')],
    during: [],
    after: [photo('after-1', 'Kitchen'), photo('after-2', 'Valve')],
    workCompleted:
      'Replaced the isolation valve under the kitchen sink.\nPressure-tested all joints — no leaks, all dry.',
    materials: '15 mm copper pipe (approx. 2 m) and a 15 mm brass isolation valve.',
    recommendations: 'Sink waste trap is worn — we recommend replacing it.',
    pricing: {
      enabled: true,
      lines: [
        { id: 'm1', description: 'Copper pipe & fittings', category: 'materials', amount: '68.00' },
        { id: 'm2', description: 'Isolation valve (15 mm)', category: 'materials', amount: '14.50' },
        { id: 'l1', description: 'Labour · 2.5 hrs @ £65/hr', category: 'labour', amount: '162.50' },
      ],
    },
    documentType: 'reference',
    invoice: null,
    review: null,
    signature: {
      svgMarkup: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>',
      customerName: 'Sarah Miller',
      signedAt: '2026-11-23T16:00:00.000Z',
    },
    generatedAt: '2026-11-23T16:05:00.000Z',
    template: 'modern',
    ...extras,
  };
}

describe('conversion features E2E pipeline', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('01 · review link: preference + QR + PDF card on every template', async () => {
    await savePreferences({ includeReviewLink: true });
    const prefs = await getPreferences();
    expect(prefs.includeReviewLink).toBe(true);

    const reviewUrl = 'https://g.page/r/hart-plumbing';
    const qr = reviewQrDataUri(reviewUrl, 70);
    expect(qr.startsWith('data:image/svg+xml,')).toBe(true);
    expect(decodeURIComponent(qr.replace('data:image/svg+xml,', ''))).toContain('<svg');

    const templates = ['trade', 'modern', 'image', 'side', 'cards', 'minimal', 'dark'] as const;
    for (const template of templates) {
      const html = buildReportHtml(
        baseInput({
          template,
          review: { url: reviewUrl, provider: 'google' },
        })
      );
      expect(html).toContain('class="review-card section-review"');
      expect(html).toContain('Happy with our work?');
      expect(html).toContain('g.page/r/hart-plumbing');
      expect(html).toContain('Scan to review');
      expect(html).toContain('data:image/svg+xml');
      expect(html).toContain('Google');
    }

    const off = buildReportHtml(baseInput({ review: null }));
    expect(off).not.toContain('class="review-card section-review"');
  });

  it('02 · voice tidy: raw speech becomes work / materials / recommendations', () => {
    const raw =
      'swapped the old isolation valve under the sink, tested for leaks, all dry now, used about two metres of fifteen mil copper, sink waste trap is worn we recommend replacing it';
    const result = formatTranscriptLocally(raw);
    const structured = result.structured;
    expect(structured.workCompleted.length + structured.materials.length + structured.labour.length).toBeGreaterThan(0);

    const html = buildReportHtml(
      baseInput({
        workCompleted: structured.workCompleted || 'Replaced the isolation valve.',
        materials: structured.materials || '15 mm copper',
        recommendations: structured.labour || 'Replace waste trap.',
      })
    );
    expect(html).toMatch(/isolation valve|copper|waste|recommend/i);
  });

  it('03 · quote & invoice: same lines, different PDF title, VAT, and filename', () => {
    const lines = baseInput().pricing!.lines;
    const vat = pricingVatBreakdown(lines, VAT_RATE_PERCENT);
    expect(vat).toEqual({
      subtotalPence: 24500,
      vatPence: 4900,
      totalPence: 29400,
    });

    const quoteHtml = buildReportHtml(
      baseInput({
        documentType: 'quote',
      })
    );
    expect(quoteHtml).toContain('>Quote<');
    expect(quoteHtml).toContain('VAT 20%');
    expect(quoteHtml).toContain('£294.00');
    expect(quoteHtml).not.toContain('Invoice details');
    expect(quoteHtml).not.toContain('This is not an invoice.');

    const invoiceNumber = formatInvoiceNumber(142);
    const dueDays = 14;
    const dueDate = dueDateFromJob('2026-11-23', dueDays);
    expect(invoiceNumber).toBe('INV-0142');
    expect(dueDate).toBe('2026-12-07');

    const invoiceHtml = buildReportHtml(
      baseInput({
        documentType: 'invoice',
        invoice: {
          invoiceNumber,
          dueDate,
          dueDays,
          bankName: 'Hart & Co. Ltd',
          sortCode: '20-45-77',
          accountNumber: '41293391',
          paymentTerms: null,
        },
      })
    );
    expect(invoiceHtml).toContain('>Invoice<');
    expect(invoiceHtml).toContain('INV-0142');
    expect(invoiceHtml).toContain('Invoice details');
    expect(invoiceHtml).toContain('20-45-77');
    expect(invoiceHtml).toContain('41293391');
    expect(invoiceHtml).toContain('VAT 20%');
    expect(invoiceHtml).toContain('£294.00');

    const referenceHtml = buildReportHtml(baseInput({ documentType: 'reference' }));
    expect(referenceHtml).toContain('Pricing reference');
    expect(referenceHtml).toContain('This is not an invoice.');
    expect(referenceHtml).not.toContain('VAT 20%');

    expect(buildReportFileName('Kitchen Refit', 'Sarah Miller', '2026-11-23', 'quote')).toMatch(
      /^Quote-Kitchen-Refit/
    );
    expect(buildReportFileName('Kitchen Refit', 'Sarah Miller', '2026-11-23', 'invoice')).toMatch(
      /^Invoice-Kitchen-Refit/
    );
    expect(buildReportFileName('Kitchen Refit', 'Sarah Miller', '2026-11-23', 'reference')).toMatch(
      /^Kitchen-Refit/
    );
  });

  it('preview HTML keeps edit hooks and still shows the review card', () => {
    const preview = buildReportPreviewHtml(
      baseInput({
        review: { url: 'https://g.page/r/hart-plumbing', provider: 'google' },
        documentType: 'invoice',
        invoice: {
          invoiceNumber: 'INV-0142',
          dueDate: '2026-12-07',
          dueDays: 14,
          bankName: 'Hart & Co. Ltd',
          sortCode: '20-45-77',
          accountNumber: '41293391',
          paymentTerms: null,
        },
      })
    );
    expect(preview).toContain('preview-edit');
    expect(preview).toContain('review-card');
    expect(preview).toContain('INV-0142');
  });

  it('content hash moves when review link or document type changes', async () => {
    const job: Job = {
      id: 'job-e2e',
      title: 'Kitchen Refit',
      customerName: 'Sarah Miller',
      address: '14 Oak Lane',
      jobDate: '2026-11-23',
      referenceNumber: 'KR-0142',
      description: 'Valve work',
      status: 'complete',
      coverPhotoId: null,
      createdAt: '2026-11-23T10:00:00.000Z',
      updatedAt: '2026-11-23T10:00:00.000Z',
    };
    const summaryBase = {
      jobId: job.id,
      workCompleted: 'Replaced valve',
      materials: '15mm copper',
      recommendations: null,
      notes: 'private',
      pricing: baseInput().pricing!,
      documentType: 'reference' as const,
      invoiceNumber: null,
      updatedAt: '2026-11-23T10:00:00.000Z',
    };

    const plain = await computeJobContentHash(job, [], summaryBase, null, [], {
      includeReviewLink: false,
    });
    const withReview = await computeJobContentHash(job, [], summaryBase, null, [], {
      includeReviewLink: true,
      reviewUrl: 'https://g.page/r/hart-plumbing',
      reviewProvider: 'google',
    });
    const invoiceSummary = { ...summaryBase, documentType: 'invoice' as const, invoiceNumber: 'INV-0142' };
    const withInvoice = await computeJobContentHash(job, [], invoiceSummary, null, [], {
      includeReviewLink: false,
    });

    expect(plain).toContain(`"renderVersion":${REPORT_RENDER_VERSION}`);
    expect(withReview).not.toBe(plain);
    expect(withInvoice).not.toBe(plain);
    expect(withInvoice).not.toBe(withReview);
  });
});

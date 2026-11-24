/**
 * AR measure → report HTML pipeline (no device).
 * Ensures measurement tables survive into free + premium PDF HTML.
 */
import { buildMeasurementCaption, measurementTable } from '@/features/arMeasure/measurementSummary';
import type { Measurement } from '@/features/arMeasure/measureSession';
import { buildReportHtml } from '@/services/pdfService/reportHtml';
import type { ReportHtmlInput } from '@/services/pdfService/types';

const t = (key: string, options?: Record<string, unknown>) => {
  if (key.endsWith('defaultLine')) return `Line ${options?.n ?? 1}`;
  if (key.endsWith('defaultArea')) return `Area ${options?.n ?? 1}`;
  return key;
};

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
      name: 'Hart Plumbing',
      logoDataUri: null,
      email: 'hello@hart.example',
      phone: '07700 900000',
      website: null,
      address: null,
      registrationNumber: null,
      vatNumber: null,
      accentColor: '#1FA84A',
      footerMessage: null,
    },
    job: {
      title: 'Kitchen measure',
      referenceNumber: 'KM-1',
      jobDate: '2026-11-24',
      customerName: 'Sam Client',
      address: '1 Test Street',
      description: null,
      status: 'in_progress',
    },
    before: [],
    during: [],
    after: [],
    workCompleted: null,
    materials: null,
    recommendations: null,
    pricing: null,
    signature: null,
    generatedAt: '2026-11-24T10:00:00.000Z',
    template: 'modern',
    ...extras,
  };
}

const measurements: Measurement[] = [
  {
    id: 'm1',
    kind: 'line',
    pointIds: ['a', 'b'],
    value: 0.76,
    ordinal: 1,
    name: 'Width',
    source: 'ar',
  },
  {
    id: 'm2',
    kind: 'line',
    pointIds: ['c', 'd'],
    value: 2.04,
    ordinal: 2,
    name: 'Height',
    source: 'ar',
  },
];

describe('AR measurement → PDF HTML', () => {
  it('builds a caption table the save sheet would store on the during photo', () => {
    const head = buildMeasurementCaption(measurements, 'm', t, {
      title: 'Hall door opening',
      includeTable: false,
    });
    const caption = `${head.trim()}\n${measurementTable(measurements, 'm', t)}`;
    expect(caption).toContain('Hall door opening');
    expect(caption).toContain('0.76 × 2.04 m');
    expect(caption).toContain('Width: 0.76 m');
    expect(caption).toContain('Height: 2.04 m');
  });

  it.each(['modern', 'trade', 'atelier', 'sentinel'] as const)(
    'prints measurement lines with <br/> in %s template',
    (template) => {
      const caption =
        'Hall door opening — 0.76 × 2.04 m\nWidth: 0.76 m\nHeight: 2.04 m';
      const html = buildReportHtml(
        baseInput({
          template,
          during: [photo('ar-shot', caption)],
        })
      );
      expect(html).toContain('Width: 0.76 m<br/>Height: 2.04 m');
      expect(html).toContain('data:image/jpeg;base64,ar-shot');
    }
  );
});

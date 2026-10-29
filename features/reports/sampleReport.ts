import { CoverDesignId, ReportImageMask, ReportTemplateId } from '@/models';
import { buildReportPreviewHtml } from '@/services/pdfService/reportHtml';
import { ReportHtmlInput } from '@/services/pdfService/types';

const FALLBACK_ACCENT = '#1FA84A';
const EXAMPLE_DATE = '2026-04-12T09:00:00.000Z';

export type LayoutExampleBranding = {
  businessName?: string | null;
  accentColor?: string | null;
  footerMessage?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Data URI for the branding cover. Omitted when the built-in cover is in use. */
  coverImageDataUri?: string | null;
  /** Data URI for the branding thank-you photo. */
  thanksImageDataUri?: string | null;
  imageMask?: ReportImageMask | null;
  coverDesign?: CoverDesignId | null;
};

function svgPhoto(tone: 'before' | 'after', accent: string, index: number): string {
  const sky = tone === 'before' ? '#D5D9D4' : '#E5F4EA';
  const block = tone === 'before' ? '#7E8781' : accent;
  const shift = index * 36;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="${sky}"/>
    <rect x="${70 + shift}" y="${140 + index * 18}" width="230" height="250" rx="8" fill="${block}"/>
    <rect x="${340 - index * 20}" y="200" width="300" height="180" rx="6" fill="#FFFFFF" fill-opacity="0.72"/>
    <rect x="70" y="460" width="630" height="16" rx="4" fill="#141816" fill-opacity="0.12"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function accentOrFallback(value: string | null | undefined): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : FALLBACK_ACCENT;
}

/** A short sample job in the real report HTML, so a layout can be judged before it is used. */
export function buildLayoutExampleHtml(template: ReportTemplateId, branding: LayoutExampleBranding = {}): string {
  const accent = accentOrFallback(branding.accentColor);
  const input: ReportHtmlInput = {
    business: {
      name: branding.businessName?.trim() || 'Your business',
      logoDataUri: null,
      email: branding.email?.trim() || 'hello@yourbusiness.com',
      phone: branding.phone?.trim() || '07700 900 000',
      website: null,
      address: null,
      registrationNumber: null,
      vatNumber: null,
      accentColor: accent,
      footerMessage: branding.footerMessage?.trim() || 'Thank you for choosing us.',
    },
    job: {
      title: 'Kitchen refit',
      referenceNumber: 'A-104',
      jobDate: '2026-04-12',
      customerName: 'Sample customer',
      address: '14 Oak Street',
      description: 'Replace the tired kitchen and leave the room ready to use.',
      status: 'complete',
    },
    before: [
      {
        id: 'example-before-1',
        dataUri: svgPhoto('before', accent, 0),
        caption: 'Units before the strip-out',
        width: 800,
        height: 600,
      },
      {
        id: 'example-before-2',
        dataUri: svgPhoto('before', accent, 1),
        caption: 'Old sink and taps',
        width: 800,
        height: 600,
      },
    ],
    after: [
      {
        id: 'example-after-1',
        dataUri: svgPhoto('after', accent, 0),
        caption: 'Finished kitchen',
        width: 800,
        height: 600,
      },
      {
        id: 'example-after-2',
        dataUri: svgPhoto('after', accent, 1),
        caption: 'New worktop',
        width: 800,
        height: 600,
      },
      {
        id: 'example-after-3',
        dataUri: svgPhoto('after', accent, 2),
        caption: 'Sink and tiling',
        width: 800,
        height: 600,
      },
    ],
    workCompleted: 'Units fitted, worktop scribed, and the sink connected.',
    materials: 'Base units\nOak worktop\nNew sink\nWall tiles',
    recommendations: 'Seal the worktop again after the first month.',
    ...(branding.coverImageDataUri ? { brandCoverDataUri: branding.coverImageDataUri } : {}),
    ...(branding.thanksImageDataUri ? { brandThanksDataUri: branding.thanksImageDataUri } : {}),
    ...(branding.imageMask ? { imageMask: branding.imageMask } : {}),
    ...(branding.coverDesign ? { coverDesign: branding.coverDesign } : {}),
    pricing: null,
    signature: {
      svgMarkup:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 64"><path d="M8 42 C 28 8, 46 58, 78 30 S 130 8, 188 34" fill="none" stroke="#141816" stroke-width="2.4" stroke-linecap="round"/></svg>',
      customerName: 'Sample customer',
      signedAt: EXAMPLE_DATE,
    },
    generatedAt: EXAMPLE_DATE,
    template,
  };
  return buildReportPreviewHtml(input);
}

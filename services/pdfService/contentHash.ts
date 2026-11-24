import * as Crypto from 'expo-crypto';

import {
  DEFAULT_REPORT_SECTION_ORDER,
  DEFAULT_REPORT_SECTIONS,
  hasAnnotations,
  Job,
  linesForReport,
  normalizeCoverDesignId,
  normalizeReportImageMask,
  normalizeReportSectionOrder,
  normalizeReportSections,
  Photo,
  PhotoArea,
  ReportSectionId,
  ReportSections,
  serializePhotoAnnotations,
  Signature,
  WorkSummary,
} from '@/models';

/** Checklist rows that print when the section is on and includeInPdf is set. */
export type ReportChecklistStamp = {
  includeInPdf: boolean;
  items: Array<{ label: string; checked: boolean }>;
};

/** Branding that changes the PDF. Defaults are left out so older reports stay current. */
export type ReportBrandStamp = {
  coverUri?: string | null;
  thanksUri?: string | null;
  imageMask?: string | null;
  coverDesign?: string | null;
  reviewUrl?: string | null;
  reviewProvider?: string | null;
  includeReviewLink?: boolean;
  reportSections?: ReportSections | null;
  reportSectionOrder?: ReportSectionId[] | null;
  bankName?: string | null;
  sortCode?: string | null;
  accountNumber?: string | null;
  paymentTerms?: string | null;
  defaultDueDays?: number | null;
  /** Effective evidence-stamp prefs that change printed photo captions. */
  stampDateTime?: boolean;
  stampAddress?: boolean;
  stampShowOnPdf?: boolean;
  /** Job checklist body — section boolean alone is not enough for freshness. */
  checklist?: ReportChecklistStamp | null;
};

/**
 * Bump this when the printed document changes. Saved reports then show as
 * outdated until they are regenerated, instead of looking current while the
 * file still has the previous layout.
 */
export const REPORT_RENDER_VERSION = 5;

/**
 * Stable hash of everything that would change the rendered PDF. Compared
 * with a saved report's sourceHash to decide if that file is out of date.
 * Status-only updates are left out: marking a job complete does not change
 * the document, and including it made a fresh report look stale.
 * Private notes are left out too: they are stored on the job and are not printed.
 */
export async function computeJobContentHash(
  job: Job,
  photos: Photo[],
  summary: WorkSummary | null,
  signature: Signature | null,
  areas: PhotoArea[] = [],
  brand: ReportBrandStamp | string | null = null
): Promise<string> {
  const stamp: ReportBrandStamp = typeof brand === 'string' || brand === null ? { coverUri: brand } : brand;
  const imageMask = normalizeReportImageMask(stamp.imageMask);
  const coverDesign = normalizeCoverDesignId(stamp.coverDesign);
  const sections = normalizeReportSections(stamp.reportSections ?? DEFAULT_REPORT_SECTIONS);
  const sectionOrder = normalizeReportSectionOrder(stamp.reportSectionOrder ?? DEFAULT_REPORT_SECTION_ORDER);
  const includeReview = sections.review && Boolean(stamp.includeReviewLink && stamp.reviewUrl);
  const canonical = {
    renderVersion: REPORT_RENDER_VERSION,
    title: job.title,
    customerName: job.customerName,
    address: job.address,
    jobDate: job.jobDate,
    referenceNumber: job.referenceNumber,
    description: job.description,
    ...(job.coverPhotoId && sections.cover ? { coverPhotoId: job.coverPhotoId } : {}),
    ...(!job.coverPhotoId && stamp.coverUri && sections.cover ? { brandCoverUri: stamp.coverUri } : {}),
    ...(stamp.thanksUri && sections.cover ? { brandThanksUri: stamp.thanksUri } : {}),
    ...(imageMask !== 'straight' ? { imageMask } : {}),
    ...(coverDesign !== 'editorial' ? { coverDesign } : {}),
    reportSections: sections,
    reportSectionOrder: sectionOrder,
    ...(includeReview
      ? { reviewUrl: stamp.reviewUrl, reviewProvider: stamp.reviewProvider ?? 'google' }
      : {}),
    ...(stamp.bankName ? { bankName: stamp.bankName } : {}),
    ...(stamp.sortCode ? { sortCode: stamp.sortCode } : {}),
    ...(stamp.accountNumber ? { accountNumber: stamp.accountNumber } : {}),
    ...(stamp.paymentTerms ? { paymentTerms: stamp.paymentTerms } : {}),
    ...(stamp.defaultDueDays && stamp.defaultDueDays !== 14 ? { defaultDueDays: stamp.defaultDueDays } : {}),
    // Defaults match AppPreferences: date/time + PDF stamp on. Address is Pro-gated at call sites.
    ...(stamp.stampDateTime === false ? { stampDateTime: false } : {}),
    ...(stamp.stampAddress === false ? { stampAddress: false } : {}),
    ...(stamp.stampShowOnPdf === false ? { stampShowOnPdf: false } : {}),
    ...(sections.checklist && stamp.checklist
      ? {
          checklist: {
            includeInPdf: stamp.checklist.includeInPdf,
            items: stamp.checklist.items
              .map((item) => ({ label: item.label, checked: item.checked }))
              .sort((a, b) => a.label.localeCompare(b.label)),
          },
        }
      : {}),
    photos: sections.photos
      ? photos
          .map((p) => ({
            id: p.id,
            type: p.type,
            caption: p.caption,
            sortOrder: p.sortOrder,
            ...(p.areaId ? { areaId: p.areaId } : {}),
            ...(p.takenAt ? { takenAt: p.takenAt } : {}),
            ...(hasAnnotations(p.annotations) ? { annotations: serializePhotoAnnotations(p.annotations) } : {}),
          }))
          .sort((a, b) => a.id.localeCompare(b.id))
      : [],
    ...(sections.photos && areas.length > 0
      ? {
          areas: areas
            .map((area) => ({ id: area.id, name: area.name, sortOrder: area.sortOrder }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        }
      : {}),
    summary: summary ? summaryForHash(summary, sections) : null,
    signature:
      sections.signature && signature
        ? { signedAt: signature.signedAt, customerName: signature.customerName }
        : null,
  };

  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify(canonical));
}

/**
 * Pricing is left out until a line would actually print. Existing reports
 * stay current for jobs that never added figures.
 */
function summaryForHash(summary: WorkSummary, sections: ReportSections) {
  const pricing = sections.costs
    ? linesForReport(summary.pricing).map((line) => ({
        id: line.id,
        description: line.description.trim(),
        category: line.category,
        amount: line.amount,
      }))
    : [];
  return {
    workCompleted: summary.workCompleted,
    materials: sections.costs ? summary.materials : null,
    recommendations: summary.recommendations,
    ...(summary.documentType !== 'reference' ? { documentType: summary.documentType } : {}),
    ...(summary.invoiceNumber ? { invoiceNumber: summary.invoiceNumber } : {}),
    ...(pricing.length > 0 ? { pricing } : {}),
  };
}

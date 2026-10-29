import * as Crypto from 'expo-crypto';

import {
  Job,
  linesForReport,
  normalizeCoverDesignId,
  normalizeReportImageMask,
  Photo,
  PhotoArea,
  Signature,
  WorkSummary,
} from '@/models';

/** Branding that changes the PDF. Defaults are left out so older reports stay current. */
export type ReportBrandStamp = {
  coverUri?: string | null;
  thanksUri?: string | null;
  imageMask?: string | null;
  coverDesign?: string | null;
};

/**
 * Bump this when the printed document changes. Saved reports then show as
 * outdated until they are regenerated, instead of looking current while the
 * file still has the previous layout.
 */
export const REPORT_RENDER_VERSION = 2;

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
  const canonical = {
    renderVersion: REPORT_RENDER_VERSION,
    title: job.title,
    customerName: job.customerName,
    address: job.address,
    jobDate: job.jobDate,
    referenceNumber: job.referenceNumber,
    description: job.description,
    ...(job.coverPhotoId ? { coverPhotoId: job.coverPhotoId } : {}),
    ...(!job.coverPhotoId && stamp.coverUri ? { brandCoverUri: stamp.coverUri } : {}),
    ...(stamp.thanksUri ? { brandThanksUri: stamp.thanksUri } : {}),
    ...(imageMask !== 'straight' ? { imageMask } : {}),
    ...(coverDesign !== 'editorial' ? { coverDesign } : {}),
    photos: photos
      .map((p) => ({
        id: p.id,
        type: p.type,
        caption: p.caption,
        sortOrder: p.sortOrder,
        ...(p.areaId ? { areaId: p.areaId } : {}),
        ...(p.takenAt ? { takenAt: p.takenAt } : {}),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    ...(areas.length > 0
      ? {
          areas: areas
            .map((area) => ({ id: area.id, name: area.name, sortOrder: area.sortOrder }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        }
      : {}),
    summary: summary ? summaryForHash(summary) : null,
    signature: signature ? { signedAt: signature.signedAt, customerName: signature.customerName } : null,
  };

  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify(canonical));
}

/**
 * Pricing is left out until a line would actually print. Existing reports
 * stay current for jobs that never added figures.
 */
function summaryForHash(summary: WorkSummary) {
  const pricing = linesForReport(summary.pricing).map((line) => ({
    id: line.id,
    description: line.description.trim(),
    category: line.category,
    amount: line.amount,
  }));
  return {
    workCompleted: summary.workCompleted,
    materials: summary.materials,
    recommendations: summary.recommendations,
    ...(pricing.length > 0 ? { pricing } : {}),
  };
}

import * as Print from 'expo-print';
import { Platform } from 'react-native';

import { businessProfileRepository, jobsRepository, photoAreasRepository, photosRepository, reportsRepository, signatureRepository, workSummaryRepository } from '@/database';
import { DEFAULT_REPORT_TEMPLATE, normalizeReportImageMask, Report, ReportTemplateId, templateAllowedForTier } from '@/models';
import { hasProAccess } from '@/services/entitlementService';
import { getPreferences } from '@/services/preferencesService';
import { buildReportFileName } from '@/utils/fileNaming';
import { logger } from '@/utils/logger';

import { ensureJobDirectories, getFileSize, readAsBase64, readTextFile, writeBase64File, writeTextFile } from '../fileService';
import { computeJobContentHash, ReportBrandStamp } from './contentHash';
import { groupReportPhotos } from './reportAreas';
import { buildReportHtml, prepareAndroidPrintHtml } from './reportHtml';
import { ReportHtmlInput, ReportPhotoData } from './types';

export { buildReportHtml, buildReportPreviewHtml } from './reportHtml';
export { REPORT_TEMPLATES, reportTemplateLabel } from './templates';
export type { ReportTemplateOption } from './templates';

export { computeJobContentHash } from './contentHash';

const DEFAULT_ACCENT = '#34D058';

function brandStamp(
  coverPhotoId: string | null,
  business: { coverImageUri: string | null; thanksImageUri: string | null; imageMask: string },
  coverDesign: string
): ReportBrandStamp {
  return {
    coverUri: coverPhotoId ? null : business.coverImageUri,
    thanksUri: business.thanksImageUri,
    imageMask: business.imageMask,
    coverDesign,
  };
}

export class ReportGenerationError extends Error {}

async function toDataUri(uri: string): Promise<string | null> {
  const base64 = (await readAsBase64(uri))?.replace(/\s/g, '');
  if (!base64) return null;
  const extension = uri.split('.').pop()?.toLowerCase();
  const mime = extension === 'png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

async function toPhotoData(photo: {
  id: string;
  localUri: string;
  caption: string | null;
  width: number;
  height: number;
  takenAt?: string | null;
}): Promise<ReportPhotoData | null> {
  const dataUri = await toDataUri(photo.localUri);
  if (!dataUri) return null;
  return {
    id: photo.id,
    dataUri,
    caption: photo.caption,
    width: photo.width,
    height: photo.height,
    takenAt: photo.takenAt ?? null,
  };
}

export type ReportDocument = {
  htmlInput: Omit<ReportHtmlInput, 'template'>;
  sourceHash: string;
};

/** Loads everything the report is built from, without writing a file. */
export async function loadReportDocument(jobId: string): Promise<ReportDocument> {
  const job = await jobsRepository.getJob(jobId);
  if (!job) {
    throw new ReportGenerationError('This job no longer exists.');
  }

  const [areas, beforePhotos, afterPhotos, summary, signature, business] = await Promise.all([
    photoAreasRepository.listAreas(jobId),
    photosRepository.listPhotos(jobId, 'before'),
    photosRepository.listPhotos(jobId, 'after'),
    workSummaryRepository.getWorkSummary(jobId),
    signatureRepository.getSignature(jobId),
    businessProfileRepository.getBusinessProfile(),
  ]);

  const allPhotos = [...beforePhotos, ...afterPhotos];
  const preferences = await getPreferences();
  const sourceHash = await computeJobContentHash(
    job,
    allPhotos,
    summary,
    signature,
    areas,
    brandStamp(job.coverPhotoId, business, preferences.coverDesign)
  );

  const isPro = await hasProAccess();

  const [taggedPhotos, logoDataUri, signatureSvg, brandCoverDataUri, brandThanksDataUri] = await Promise.all([
    Promise.all(
      allPhotos.map(async (photo) => {
        const data = await toPhotoData(photo);
        if (!data) return null;
        return { ...data, type: photo.type, areaId: photo.areaId, sortOrder: photo.sortOrder };
      })
    ),
    isPro && business.logoUri ? toDataUri(business.logoUri) : Promise.resolve(null),
    signature ? readTextFile(signature.localSignatureUri) : Promise.resolve(null),
    business.coverImageUri ? toDataUri(business.coverImageUri) : Promise.resolve(null),
    business.thanksImageUri ? toDataUri(business.thanksImageUri) : Promise.resolve(null),
  ]);
  const readyPhotos = taggedPhotos.filter((photo): photo is NonNullable<typeof photo> => photo !== null);
  const photoGroups = groupReportPhotos(areas, readyPhotos);

  return {
    sourceHash,
    htmlInput: {
      business: {
        name: business.businessName?.trim() || 'Your business',
        ownerName: business.ownerName,
        logoDataUri,
        email: business.email,
        phone: business.phone,
        website: business.website,
        address: business.address,
        registrationNumber: business.registrationNumber,
        vatNumber: business.vatNumber,
        accentColor: isPro ? business.accentColor || DEFAULT_ACCENT : DEFAULT_ACCENT,
        footerMessage: business.footerMessage,
      },
      job: {
        title: job.title,
        referenceNumber: job.referenceNumber,
        jobDate: job.jobDate,
        customerName: job.customerName,
        address: job.address,
        description: job.description,
        status: job.status,
      },
      before: readyPhotos.filter((photo) => photo.type === 'before'),
      after: readyPhotos.filter((photo) => photo.type === 'after'),
      coverDataUri: job.coverPhotoId ? readyPhotos.find((photo) => photo.id === job.coverPhotoId)?.dataUri ?? null : null,
      ...(!job.coverPhotoId && brandCoverDataUri ? { brandCoverDataUri } : {}),
      ...(brandThanksDataUri ? { brandThanksDataUri } : {}),
      imageMask: normalizeReportImageMask(business.imageMask),
      coverDesign: preferences.coverDesign,
      ...(photoGroups ? { areas: photoGroups } : {}),
      workCompleted: summary?.workCompleted ?? null,
      materials: summary?.materials ?? null,
      recommendations: summary?.recommendations ?? null,
      // summary.notes stays on the device. It is not part of the customer PDF.
      pricing: summary?.pricing ?? null,
      signature:
        signature && signatureSvg
          ? { svgMarkup: signatureSvg, customerName: signature.customerName, signedAt: signature.signedAt }
          : null,
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function generateReportPdf(jobId: string, template: ReportTemplateId = DEFAULT_REPORT_TEMPLATE): Promise<Report> {
  const document = await loadReportDocument(jobId);
  const allowed = templateAllowedForTier(template, await hasProAccess());
  const html = buildReportHtml({ ...document.htmlInput, template: allowed });

  const { reports: reportsDir } = await ensureJobDirectories(jobId);
  const fileName = buildReportFileName(
    document.htmlInput.job.title,
    document.htmlInput.job.customerName,
    document.htmlInput.job.jobDate
  );

  // Native builds render a PDF on device. The web preview has no PDF engine,
  // so it stores the same self-contained HTML locally and can still be opened offline.
  let destination: string;
  if (Platform.OS === 'web') {
    const htmlName = fileName.replace(/\.pdf$/i, '.html');
    destination = `${reportsDir}${Date.now()}-${htmlName}`;
    try {
      await writeTextFile(destination, html);
    } catch (error) {
      logger.error('PDF generation failed', error);
      throw new ReportGenerationError("We couldn't create this report. Your job is safe — try again.");
    }
  } else {
    // A4 at 72 DPI. Android otherwise prints onto US Letter and clips the layout.
    // Hash marks are written as a named character so the print WebView does not
    // cut the document off, and so colours stay real rgb() values.
    const printableHtml = Platform.OS === 'android' ? prepareAndroidPrintHtml(html) : html;
    let printResult: { uri?: string; base64?: string } | null = null;
    try {
      // Ask for the bytes directly. On Android Expo Go the print file lands in
      // the host app's cache, outside this project's sandbox, so copying that
      // URI fails with "isn't readable".
      printResult = await Print.printToFileAsync({
        html: printableHtml,
        base64: true,
        width: 595,
        height: 842,
        ...(Platform.OS === 'android' ? { textZoom: 100 } : {}),
      });
    } catch (error) {
      logger.error('PDF generation failed', error);
      throw new ReportGenerationError("We couldn't create this report. Your job is safe — try again.");
    }
    if (!printResult?.base64) {
      logger.error('PDF generation failed', new Error('Print returned no file'));
      throw new ReportGenerationError("We couldn't create this report. Your job is safe — try again.");
    }
    destination = `${reportsDir}${Date.now()}-${fileName}`;
    try {
      await writeBase64File(destination, printResult.base64);
    } catch (error) {
      logger.error('Could not store the generated PDF', error);
      throw new ReportGenerationError("We couldn't create this report. Your job is safe — try again.");
    }
  }

  const fileSize = await getFileSize(destination);
  const storedFileName = Platform.OS === 'web' ? fileName.replace(/\.pdf$/i, '.html') : fileName;

  return reportsRepository.createReport({
    jobId,
    localPdfUri: destination,
    fileName: storedFileName,
    fileSize,
    sourceHash: document.sourceHash,
    templateId: allowed,
  });
}

export async function getReportFreshness(jobId: string): Promise<'none' | 'stale' | 'fresh'> {
  const [job, latest, photos, summary, signature, areas, business, preferences] = await Promise.all([
    jobsRepository.getJob(jobId),
    reportsRepository.getLatestReportForJob(jobId),
    photosRepository.listPhotos(jobId),
    workSummaryRepository.getWorkSummary(jobId),
    signatureRepository.getSignature(jobId),
    photoAreasRepository.listAreas(jobId),
    businessProfileRepository.getBusinessProfile(),
    getPreferences(),
  ]);

  if (!latest || !job) return 'none';
  const currentHash = await computeJobContentHash(
    job,
    photos,
    summary,
    signature,
    areas,
    brandStamp(job.coverPhotoId, business, preferences.coverDesign)
  );
  return currentHash === latest.sourceHash ? 'fresh' : 'stale';
}

/** Reads a stored image as a data URI for report HTML. */
export async function imageFileToDataUri(uri: string): Promise<string | null> {
  return toDataUri(uri);
}

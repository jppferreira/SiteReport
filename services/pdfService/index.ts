import * as Print from 'expo-print';
import { Platform } from 'react-native';

import { businessProfileRepository, jobChecklistsRepository, jobsRepository, photoAreasRepository, photosRepository, reportsRepository, signatureRepository, workSummaryRepository } from '@/database';
import {
  DEFAULT_DOCUMENT_TYPE,
  DEFAULT_REPORT_TEMPLATE,
  dueDateFromJob,
  formatInvoiceNumber,
  normalizeDocumentType,
  normalizeReportImageMask,
  PhotoAnnotations,
  Report,
  ReportTemplateId,
  templateAllowedForTier,
} from '@/models';

function formatProvisionalInvoice(sequence: number): string {
  return formatInvoiceNumber(sequence);
}
import { formatStampCaptionParts } from '@/services/evidenceStamp';
import { resolveStampAddress } from '@/services/locationStamp';
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
  business: {
    coverImageUri: string | null;
    thanksImageUri: string | null;
    imageMask: string;
    reviewUrl: string | null;
    reviewProvider: string;
    bankName: string | null;
    sortCode: string | null;
    accountNumber: string | null;
    paymentTerms: string | null;
    defaultDueDays: number;
  },
  coverDesign: string,
  includeReviewLink: boolean,
  isPro: boolean,
  reportSections?: ReportBrandStamp['reportSections'],
  reportSectionOrder?: ReportBrandStamp['reportSectionOrder'],
  stampPrefs?: {
    stampDateTime: boolean;
    stampAddress: boolean;
    stampShowOnPdf: boolean;
  },
  checklist?: ReportBrandStamp['checklist']
): ReportBrandStamp {
  return {
    coverUri: coverPhotoId ? null : business.coverImageUri,
    thanksUri: business.thanksImageUri,
    imageMask: business.imageMask,
    coverDesign,
    includeReviewLink: isPro && includeReviewLink,
    reviewUrl: business.reviewUrl,
    reviewProvider: business.reviewProvider,
    reportSections: reportSections ?? null,
    reportSectionOrder: reportSectionOrder ?? null,
    bankName: business.bankName,
    sortCode: business.sortCode,
    accountNumber: business.accountNumber,
    paymentTerms: business.paymentTerms,
    defaultDueDays: business.defaultDueDays,
    stampDateTime: stampPrefs?.stampDateTime ?? true,
    stampAddress: stampPrefs?.stampAddress ?? true,
    stampShowOnPdf: stampPrefs?.stampShowOnPdf ?? true,
    checklist: checklist ?? null,
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

async function toPhotoData(
  photo: {
    id: string;
    localUri: string;
    caption: string | null;
    width: number;
    height: number;
    takenAt?: string | null;
    annotations?: PhotoAnnotations | null;
  },
  stamp: {
    address: string | null;
    stampDateTime: boolean;
    stampAddress: boolean;
    stampShowOnPdf: boolean;
  }
): Promise<ReportPhotoData | null> {
  const dataUri = await toDataUri(photo.localUri);
  if (!dataUri) return null;
  return {
    id: photo.id,
    dataUri,
    caption: formatStampCaptionParts({
      caption: photo.caption,
      takenAt: photo.takenAt,
      address: stamp.address,
      stampDateTime: stamp.stampDateTime,
      stampAddress: stamp.stampAddress,
      stampShowOnPdf: stamp.stampShowOnPdf,
    }) || null,
    width: photo.width,
    height: photo.height,
    takenAt: photo.takenAt ?? null,
    annotations: photo.annotations ?? null,
  };
}

export type ReportDocument = {
  htmlInput: Omit<ReportHtmlInput, 'template'>;
  sourceHash: string;
};

export type LoadReportDocumentOptions = {
  /**
   * Preview should not wait on a live GPS fix — use the job address for the
   * evidence stamp so the screen can open immediately.
   */
  useJobAddressOnly?: boolean;
};

/** Loads everything the report is built from, without writing a file. */
export async function loadReportDocument(
  jobId: string,
  options?: LoadReportDocumentOptions
): Promise<ReportDocument> {
  const job = await jobsRepository.getJob(jobId);
  if (!job) {
    throw new ReportGenerationError('This job no longer exists.');
  }

  const [areas, beforePhotos, duringPhotos, afterPhotos, summary, signature, business, checklist] = await Promise.all([
    photoAreasRepository.listAreas(jobId),
    photosRepository.listPhotos(jobId, 'before'),
    photosRepository.listPhotos(jobId, 'during'),
    photosRepository.listPhotos(jobId, 'after'),
    workSummaryRepository.getWorkSummary(jobId),
    signatureRepository.getSignature(jobId),
    businessProfileRepository.getBusinessProfile(),
    jobChecklistsRepository.getChecklist(jobId),
  ]);

  const allPhotos = [...beforePhotos, ...duringPhotos, ...afterPhotos];
  const preferences = await getPreferences();
  const isPro = await hasProAccess();
  const sections = preferences.reportSections;
  const sectionOrder = preferences.reportSectionOrder;
  const includeReviewPref = sections.review && preferences.includeReviewLink;
  const stampAddressEnabled = isPro && preferences.stampAddress;
  const stampAddressLabel = stampAddressEnabled
    ? options?.useJobAddressOnly
      ? job.address?.trim() || null
      : await resolveStampAddress(job.address)
    : null;
  const stampOptions = {
    address: stampAddressLabel,
    stampDateTime: preferences.stampDateTime,
    stampAddress: stampAddressEnabled,
    stampShowOnPdf: preferences.stampShowOnPdf,
  };
  const sourceHash = await computeJobContentHash(
    job,
    allPhotos,
    summary,
    signature,
    areas,
    brandStamp(
      job.coverPhotoId,
      business,
      preferences.coverDesign,
      includeReviewPref,
      isPro,
      sections,
      sectionOrder,
      {
        stampDateTime: preferences.stampDateTime,
        stampAddress: stampAddressEnabled,
        stampShowOnPdf: preferences.stampShowOnPdf,
      },
      checklist
        ? {
            includeInPdf: checklist.includeInPdf,
            items: checklist.items.map((item) => ({ label: item.label, checked: item.checked })),
          }
        : null
    )
  );

  const [taggedPhotos, logoDataUri, signatureSvg, brandCoverDataUri, brandThanksDataUri] = await Promise.all([
    Promise.all(
      allPhotos.map(async (photo) => {
        const data = await toPhotoData(photo, stampOptions);
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

  const documentType = normalizeDocumentType(summary?.documentType ?? DEFAULT_DOCUMENT_TYPE);
  const effectiveType = isPro || documentType === 'reference' ? documentType : DEFAULT_DOCUMENT_TYPE;
  const invoiceNumber =
    summary?.invoiceNumber ??
    (effectiveType === 'invoice' ? formatProvisionalInvoice(business.nextInvoiceSequence) : null);

  const reviewUrl = business.reviewUrl?.trim() || null;
  const includeReview = isPro && includeReviewPref && Boolean(reviewUrl);
  const includeCover = sections.cover;
  const includePhotos = sections.photos;
  const includeChecklist =
    sections.checklist && Boolean(checklist?.includeInPdf && checklist.items.length > 0);
  const includeCosts = sections.costs;
  const includeSignature = sections.signature && Boolean(signature && signatureSvg);

  const before = includePhotos ? readyPhotos.filter((photo) => photo.type === 'before') : [];
  const during = includePhotos ? readyPhotos.filter((photo) => photo.type === 'during') : [];
  const after = includePhotos ? readyPhotos.filter((photo) => photo.type === 'after') : [];

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
      before,
      during,
      after,
      coverDataUri: includeCover
        ? job.coverPhotoId
          ? readyPhotos.find((photo) => photo.id === job.coverPhotoId)?.dataUri ?? null
          : null
        : null,
      ...(!job.coverPhotoId && brandCoverDataUri && includeCover ? { brandCoverDataUri } : {}),
      ...(brandThanksDataUri && includeCover ? { brandThanksDataUri } : {}),
      imageMask: normalizeReportImageMask(business.imageMask),
      coverDesign: preferences.coverDesign,
      photoAnnotationLayout: preferences.photoAnnotationLayout,
      ...(includePhotos && photoGroups ? { areas: photoGroups } : {}),
      workCompleted: summary?.workCompleted ?? null,
      materials: includeCosts ? summary?.materials ?? null : null,
      recommendations: summary?.recommendations ?? null,
      checklist: includeChecklist
        ? checklist!.items.map((item) => ({ label: item.label, checked: item.checked }))
        : null,
      // summary.notes stays on the device. It is not part of the customer PDF.
      pricing: includeCosts ? summary?.pricing ?? null : null,
      documentType: effectiveType,
      invoice:
        effectiveType === 'invoice' && invoiceNumber
          ? {
              invoiceNumber,
              dueDays: business.defaultDueDays,
              dueDate: dueDateFromJob(job.jobDate, business.defaultDueDays),
              bankName: business.bankName,
              sortCode: business.sortCode,
              accountNumber: business.accountNumber,
              paymentTerms: business.paymentTerms,
            }
          : null,
      review: includeReview && reviewUrl ? { url: reviewUrl, provider: business.reviewProvider } : null,
      signature: includeSignature
        ? { svgMarkup: signatureSvg!, customerName: signature!.customerName, signedAt: signature!.signedAt }
        : null,
      reportSections: sections,
      reportSectionOrder: sectionOrder,
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function generateReportPdf(jobId: string, template: ReportTemplateId = DEFAULT_REPORT_TEMPLATE): Promise<Report> {
  const document = await loadReportDocument(jobId);
  const allowed = templateAllowedForTier(template, await hasProAccess());
  let htmlInput = document.htmlInput;
  if (htmlInput.documentType === 'invoice' && (await hasProAccess())) {
    const summary = await workSummaryRepository.getWorkSummary(jobId);
    let invoiceNumber = summary?.invoiceNumber ?? null;
    if (!invoiceNumber) {
      invoiceNumber = await businessProfileRepository.allocateInvoiceNumber();
      await workSummaryRepository.saveWorkSummary(jobId, { invoiceNumber, documentType: 'invoice' });
    }
    if (htmlInput.invoice) {
      htmlInput = {
        ...htmlInput,
        invoice: { ...htmlInput.invoice, invoiceNumber },
      };
    }
  }
  const html = buildReportHtml({ ...htmlInput, template: allowed });

  const { reports: reportsDir } = await ensureJobDirectories(jobId);
  const fileName = buildReportFileName(
    htmlInput.job.title,
    htmlInput.job.customerName,
    htmlInput.job.jobDate,
    htmlInput.documentType
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
  const [job, latest, photos, summary, signature, areas, business, preferences, checklist] = await Promise.all([
    jobsRepository.getJob(jobId),
    reportsRepository.getLatestReportForJob(jobId),
    photosRepository.listPhotos(jobId),
    workSummaryRepository.getWorkSummary(jobId),
    signatureRepository.getSignature(jobId),
    photoAreasRepository.listAreas(jobId),
    businessProfileRepository.getBusinessProfile(),
    getPreferences(),
    jobChecklistsRepository.getChecklist(jobId),
  ]);

  if (!latest || !job) return 'none';
  const isPro = await hasProAccess();
  const includeReviewPref = preferences.reportSections.review && preferences.includeReviewLink;
  const stampAddressEnabled = isPro && preferences.stampAddress;
  const currentHash = await computeJobContentHash(
    job,
    photos,
    summary,
    signature,
    areas,
    brandStamp(
      job.coverPhotoId,
      business,
      preferences.coverDesign,
      includeReviewPref,
      isPro,
      preferences.reportSections,
      preferences.reportSectionOrder,
      {
        stampDateTime: preferences.stampDateTime,
        stampAddress: stampAddressEnabled,
        stampShowOnPdf: preferences.stampShowOnPdf,
      },
      checklist
        ? {
            includeInPdf: checklist.includeInPdf,
            items: checklist.items.map((item) => ({ label: item.label, checked: item.checked })),
          }
        : null
    )
  );
  return currentHash === latest.sourceHash ? 'fresh' : 'stale';
}

/** Reads a stored image as a data URI for report HTML. */
export async function imageFileToDataUri(uri: string): Promise<string | null> {
  return toDataUri(uri);
}

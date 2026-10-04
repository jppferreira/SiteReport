import * as Print from 'expo-print';

import { businessProfileRepository, jobsRepository, photosRepository, reportsRepository, signatureRepository, workSummaryRepository } from '@/database';
import { Report } from '@/models';
import { hasProAccess } from '@/services/entitlementService';
import { buildReportFileName } from '@/utils/fileNaming';
import { logger } from '@/utils/logger';

import { ensureJobDirectories, getFileSize, readAsBase64, readTextFile } from '../fileService';
import { computeJobContentHash } from './contentHash';
import { buildReportHtml } from './reportHtml';
import { ReportPhotoData } from './types';

export { computeJobContentHash } from './contentHash';

const DEFAULT_ACCENT = '#34D058';

export class ReportGenerationError extends Error {}

async function toDataUri(uri: string): Promise<string | null> {
  const base64 = await readAsBase64(uri);
  if (!base64) return null;
  const extension = uri.split('.').pop()?.toLowerCase();
  const mime = extension === 'png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

async function toPhotoData(photo: { id: string; localUri: string; caption: string | null; width: number; height: number }): Promise<ReportPhotoData | null> {
  const dataUri = await toDataUri(photo.localUri);
  if (!dataUri) return null;
  return { id: photo.id, dataUri, caption: photo.caption, width: photo.width, height: photo.height };
}

export async function generateReportPdf(jobId: string): Promise<Report> {
  const job = await jobsRepository.getJob(jobId);
  if (!job) {
    throw new ReportGenerationError('This job no longer exists.');
  }

  const [beforePhotos, afterPhotos, summary, signature, business] = await Promise.all([
    photosRepository.listPhotos(jobId, 'before'),
    photosRepository.listPhotos(jobId, 'after'),
    workSummaryRepository.getWorkSummary(jobId),
    signatureRepository.getSignature(jobId),
    businessProfileRepository.getBusinessProfile(),
  ]);

  const allPhotos = [...beforePhotos, ...afterPhotos];
  const sourceHash = await computeJobContentHash(job, allPhotos, summary, signature);

  const isPro = await hasProAccess();

  const [beforeData, afterData, logoDataUri, signatureSvg] = await Promise.all([
    Promise.all(beforePhotos.map(toPhotoData)),
    Promise.all(afterPhotos.map(toPhotoData)),
    isPro && business.logoUri ? toDataUri(business.logoUri) : Promise.resolve(null),
    signature ? readTextFile(signature.localSignatureUri) : Promise.resolve(null),
  ]);

  const html = buildReportHtml({
    business: {
      name: business.businessName?.trim() || 'Your business',
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
    },
    before: beforeData.filter((p): p is ReportPhotoData => p !== null),
    after: afterData.filter((p): p is ReportPhotoData => p !== null),
    workCompleted: summary?.workCompleted ?? null,
    materials: summary?.materials ?? null,
    recommendations: summary?.recommendations ?? null,
    signature:
      signature && signatureSvg
        ? { svgMarkup: signatureSvg, customerName: signature.customerName, signedAt: signature.signedAt }
        : null,
    generatedAt: new Date().toISOString(),
  });

  let printResult: { uri: string };
  try {
    printResult = await Print.printToFileAsync({ html, base64: false });
  } catch (error) {
    logger.error('PDF generation failed', error);
    throw new ReportGenerationError("We couldn't create this report. Your job is safe — try again.");
  }

  const { reports: reportsDir } = await ensureJobDirectories(jobId);
  const fileName = buildReportFileName(job.title, job.customerName, job.jobDate);
  const destination = `${reportsDir}${Date.now()}-${fileName}`;

  const { copyAsync } = await import('expo-file-system/legacy');
  await copyAsync({ from: printResult.uri, to: destination });
  const fileSize = await getFileSize(destination);

  return reportsRepository.createReport({
    jobId,
    localPdfUri: destination,
    fileName,
    fileSize,
    sourceHash,
  });
}

export async function getReportFreshness(jobId: string): Promise<'none' | 'stale' | 'fresh'> {
  const [job, latest, photos, summary, signature] = await Promise.all([
    jobsRepository.getJob(jobId),
    reportsRepository.getLatestReportForJob(jobId),
    photosRepository.listPhotos(jobId),
    workSummaryRepository.getWorkSummary(jobId),
    signatureRepository.getSignature(jobId),
  ]);

  if (!latest || !job) return 'none';
  const currentHash = await computeJobContentHash(job, photos, summary, signature);
  return currentHash === latest.sourceHash ? 'fresh' : 'stale';
}

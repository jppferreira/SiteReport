import * as FileSystem from 'expo-file-system/legacy';

import {
  businessProfileRepository,
  jobsRepository,
  photosRepository,
  reportsRepository,
  signatureRepository,
  workSummaryRepository,
} from '@/database';
import { getDatabase } from '@/database/client';

import { deleteAllAppFiles } from './fileService';

/**
 * Exports structured job data (titles, customer/job metadata, captions,
 * work summary text, report metadata) as a single local JSON file for the
 * user to keep or move to another device. Photo and signature binaries are
 * intentionally excluded to keep the export small and text-only — it is a
 * portable record, not a full device backup.
 */
export async function exportAppDataToJson(): Promise<string> {
  const jobs = await jobsRepository.listJobs('all');
  const business = await businessProfileRepository.getBusinessProfile();

  const jobsWithDetails = await Promise.all(
    jobs.map(async (job) => {
      const [photos, summary, signature, reports] = await Promise.all([
        photosRepository.listPhotos(job.id),
        workSummaryRepository.getWorkSummary(job.id),
        signatureRepository.getSignature(job.id),
        reportsRepository.listReportsForJob(job.id),
      ]);
      return {
        ...job,
        photos: photos.map((p) => ({ type: p.type, caption: p.caption, sortOrder: p.sortOrder })),
        workSummary: summary,
        hasSignature: Boolean(signature),
        reports: reports.map((r) => ({ fileName: r.fileName, generatedAt: r.generatedAt, fileSize: r.fileSize })),
      };
    })
  );

  const payload = {
    exportedAt: new Date().toISOString(),
    businessProfile: { businessName: business.businessName, email: business.email, phone: business.phone },
    jobs: jobsWithDetails,
  };

  const path = `${FileSystem.cacheDirectory}sitereport-export-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return path;
}

/**
 * Wipes all job content: jobs, photos, summaries, signatures, reports and
 * the business profile, plus their files on disk. Deliberately does not
 * touch purchase/entitlement state or app preferences — those are not
 * "job data" and a user who paid for Pro should keep that after clearing
 * their jobs.
 */
export async function deleteAllAppData(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM photos;
    DELETE FROM work_summaries;
    DELETE FROM signatures;
    DELETE FROM reports;
    DELETE FROM jobs;
    DELETE FROM business_profile;
  `);
  await deleteAllAppFiles();
}

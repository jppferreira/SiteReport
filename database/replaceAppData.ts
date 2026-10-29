import { getDatabase } from '@/database/client';
import { serializePricing } from '@/models';

import { BackupManifest } from '@/services/backup/archive';
import { isSafeRelativePath } from '@/services/backup/paths';

/** Replaces job rows. Call only after the backup files have been verified on disk. */
export async function replaceAppData(manifest: BackupManifest, root: string): Promise<void> {
  const pathFor = (relative: string) => {
    if (!isSafeRelativePath(relative)) throw new Error('Unsafe backup path.');
    return `${root}${relative}`;
  };
  const optionalPath = (relative: string | null) => (relative ? pathFor(relative) : null);

  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM photos;
      DELETE FROM photo_areas;
      DELETE FROM work_summaries;
      DELETE FROM signatures;
      DELETE FROM reports;
      DELETE FROM jobs;
      DELETE FROM business_profile;
    `);

    for (const job of manifest.jobs) {
      await db.runAsync(
        `INSERT INTO jobs (id, title, customerName, address, jobDate, referenceNumber, description, status, coverPhotoId, createdAt, updatedAt)
         VALUES ($id, $title, $customerName, $address, $jobDate, $referenceNumber, $description, $status, $coverPhotoId, $createdAt, $updatedAt)`,
        {
          $id: job.id,
          $title: job.title,
          $customerName: job.customerName,
          $address: job.address,
          $jobDate: job.jobDate,
          $referenceNumber: job.referenceNumber,
          $description: job.description,
          $status: job.status,
          $coverPhotoId: job.coverPhotoId,
          $createdAt: job.createdAt,
          $updatedAt: job.updatedAt,
        }
      );
    }

    for (const area of manifest.areas) {
      await db.runAsync(
        `INSERT INTO photo_areas (id, jobId, name, sortOrder, createdAt)
         VALUES ($id, $jobId, $name, $sortOrder, $createdAt)`,
        {
          $id: area.id,
          $jobId: area.jobId,
          $name: area.name,
          $sortOrder: area.sortOrder,
          $createdAt: area.createdAt,
        }
      );
    }

    for (const photo of manifest.photos) {
      await db.runAsync(
        `INSERT INTO photos (id, jobId, areaId, localUri, thumbnailUri, type, caption, sortOrder, width, height, takenAt, createdAt)
         VALUES ($id, $jobId, $areaId, $localUri, $thumbnailUri, $type, $caption, $sortOrder, $width, $height, $takenAt, $createdAt)`,
        {
          $id: photo.id,
          $jobId: photo.jobId,
          $areaId: photo.areaId,
          $localUri: pathFor(photo.localUri),
          $thumbnailUri: pathFor(photo.thumbnailUri),
          $type: photo.type,
          $caption: photo.caption,
          $sortOrder: photo.sortOrder,
          $width: photo.width,
          $height: photo.height,
          $takenAt: photo.takenAt,
          $createdAt: photo.createdAt,
        }
      );
    }

    for (const summary of manifest.summaries) {
      await db.runAsync(
        `INSERT INTO work_summaries (jobId, workCompleted, materials, recommendations, notes, pricingJson, updatedAt)
         VALUES ($jobId, $workCompleted, $materials, $recommendations, $notes, $pricingJson, $updatedAt)`,
        {
          $jobId: summary.jobId,
          $workCompleted: summary.workCompleted,
          $materials: summary.materials,
          $recommendations: summary.recommendations,
          $notes: summary.notes,
          $pricingJson: serializePricing(summary.pricing),
          $updatedAt: summary.updatedAt,
        }
      );
    }

    for (const signature of manifest.signatures) {
      await db.runAsync(
        `INSERT INTO signatures (jobId, customerName, localSignatureUri, width, height, signedAt)
         VALUES ($jobId, $customerName, $localSignatureUri, $width, $height, $signedAt)`,
        {
          $jobId: signature.jobId,
          $customerName: signature.customerName,
          $localSignatureUri: pathFor(signature.localSignatureUri),
          $width: signature.width,
          $height: signature.height,
          $signedAt: signature.signedAt,
        }
      );
    }

    for (const report of manifest.reports) {
      await db.runAsync(
        `INSERT INTO reports (id, jobId, localPdfUri, fileName, generatedAt, fileSize, version, sourceHash, templateId)
         VALUES ($id, $jobId, $localPdfUri, $fileName, $generatedAt, $fileSize, $version, $sourceHash, $templateId)`,
        {
          $id: report.id,
          $jobId: report.jobId,
          $localPdfUri: pathFor(report.localPdfUri),
          $fileName: report.fileName,
          $generatedAt: report.generatedAt,
          $fileSize: report.fileSize,
          $version: report.version,
          $sourceHash: report.sourceHash,
          $templateId: report.templateId,
        }
      );
    }

    const profile = manifest.businessProfile;
    if (profile) {
      await db.runAsync(
        `INSERT INTO business_profile
           (id, businessName, logoUri, ownerName, email, phone, website, address, registrationNumber, vatNumber, accentColor, footerMessage, coverImageUri, thanksImageUri, imageMask, updatedAt)
         VALUES (1, $businessName, $logoUri, $ownerName, $email, $phone, $website, $address, $registrationNumber, $vatNumber, $accentColor, $footerMessage, $coverImageUri, $thanksImageUri, $imageMask, $updatedAt)`,
        {
          $businessName: profile.businessName,
          $logoUri: optionalPath(profile.logoUri),
          $ownerName: profile.ownerName,
          $email: profile.email,
          $phone: profile.phone,
          $website: profile.website,
          $address: profile.address,
          $registrationNumber: profile.registrationNumber,
          $vatNumber: profile.vatNumber,
          $accentColor: profile.accentColor,
          $footerMessage: profile.footerMessage,
          $coverImageUri: optionalPath(profile.coverImageUri),
          $thanksImageUri: optionalPath(profile.thanksImageUri),
          $imageMask: profile.imageMask,
          $updatedAt: profile.updatedAt,
        }
      );
    }
  });
}

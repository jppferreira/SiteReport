import { getDatabase } from '@/database/client';
import { serializeChecklistItems, serializePhotoAnnotations, serializePricing } from '@/models';

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
      DELETE FROM report_events;
      DELETE FROM reports;
      DELETE FROM documents;
      DELETE FROM job_checklists;
      DELETE FROM jobs;
      DELETE FROM customers;
      DELETE FROM business_profile;
    `);

    for (const job of manifest.jobs) {
      await db.runAsync(
        `INSERT INTO jobs (id, title, customerName, address, jobDate, referenceNumber, description, status, coverPhotoId, isQuick, customerId, createdAt, updatedAt)
         VALUES ($id, $title, $customerName, $address, $jobDate, $referenceNumber, $description, $status, $coverPhotoId, $isQuick, $customerId, $createdAt, $updatedAt)`,
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
          $isQuick: job.isQuick ? 1 : 0,
          $customerId: job.customerId,
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
        `INSERT INTO photos (id, jobId, areaId, localUri, thumbnailUri, type, caption, sortOrder, width, height, takenAt, annotations, createdAt)
         VALUES ($id, $jobId, $areaId, $localUri, $thumbnailUri, $type, $caption, $sortOrder, $width, $height, $takenAt, $annotations, $createdAt)`,
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
          $annotations: serializePhotoAnnotations(photo.annotations),
          $createdAt: photo.createdAt,
        }
      );
    }

    for (const summary of manifest.summaries) {
      await db.runAsync(
        `INSERT INTO work_summaries (jobId, workCompleted, materials, recommendations, notes, pricingJson, documentType, invoiceNumber, updatedAt)
         VALUES ($jobId, $workCompleted, $materials, $recommendations, $notes, $pricingJson, $documentType, $invoiceNumber, $updatedAt)`,
        {
          $jobId: summary.jobId,
          $workCompleted: summary.workCompleted,
          $materials: summary.materials,
          $recommendations: summary.recommendations,
          $notes: summary.notes,
          $pricingJson: serializePricing(summary.pricing),
          $documentType: (summary as { documentType?: string }).documentType ?? 'reference',
          $invoiceNumber: (summary as { invoiceNumber?: string | null }).invoiceNumber ?? null,
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
        `INSERT INTO reports (id, jobId, localPdfUri, fileName, generatedAt, fileSize, version, sourceHash, templateId, status)
         VALUES ($id, $jobId, $localPdfUri, $fileName, $generatedAt, $fileSize, $version, $sourceHash, $templateId, $status)`,
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
          $status: report.status,
        }
      );
    }

    for (const checklist of manifest.checklists ?? []) {
      await db.runAsync(
        `INSERT INTO job_checklists (jobId, templateId, includeInPdf, itemsJson, updatedAt)
         VALUES ($jobId, $templateId, $includeInPdf, $itemsJson, $updatedAt)`,
        {
          $jobId: checklist.jobId,
          $templateId: checklist.templateId,
          $includeInPdf: checklist.includeInPdf ? 1 : 0,
          $itemsJson: serializeChecklistItems(checklist.items),
          $updatedAt: checklist.updatedAt,
        }
      );
    }

    for (const doc of manifest.documents ?? []) {
      await db.runAsync(
        `INSERT INTO documents (
          id, jobId, kind, number, status, title,
          totalPence, netPence, vatPence,
          dueDate, validUntil, sentAt, paidAt, acceptedAt, declinedAt,
          paidMethod, paidAmountPence, sourceDocumentId, attachedReportId,
          pricingSnapshotJson, reportId, localPdfUri, fileName, createdAt, updatedAt
        ) VALUES (
          $id, $jobId, $kind, $number, $status, $title,
          $totalPence, $netPence, $vatPence,
          $dueDate, $validUntil, $sentAt, $paidAt, $acceptedAt, $declinedAt,
          $paidMethod, $paidAmountPence, $sourceDocumentId, $attachedReportId,
          $pricingSnapshotJson, $reportId, $localPdfUri, $fileName, $createdAt, $updatedAt
        )`,
        {
          $id: doc.id,
          $jobId: doc.jobId,
          $kind: doc.kind,
          $number: doc.number,
          $status: doc.status,
          $title: doc.title,
          $totalPence: doc.totalPence,
          $netPence: doc.netPence,
          $vatPence: doc.vatPence,
          $dueDate: doc.dueDate,
          $validUntil: doc.validUntil,
          $sentAt: doc.sentAt,
          $paidAt: doc.paidAt,
          $acceptedAt: doc.acceptedAt,
          $declinedAt: doc.declinedAt,
          $paidMethod: doc.paidMethod,
          $paidAmountPence: doc.paidAmountPence,
          $sourceDocumentId: doc.sourceDocumentId,
          $attachedReportId: doc.attachedReportId,
          $pricingSnapshotJson: doc.pricingSnapshotJson,
          $reportId: doc.reportId,
          $localPdfUri: optionalPath(doc.localPdfUri),
          $fileName: doc.fileName,
          $createdAt: doc.createdAt,
          $updatedAt: doc.updatedAt,
        }
      );
    }

    if ((manifest.customers ?? []).length > 0) {
      try {
        await db.execAsync('DELETE FROM customers');
        for (const customer of manifest.customers ?? []) {
          await db.runAsync(
            `INSERT INTO customers (id, name, phone, email, address, postcode, createdAt, updatedAt)
             VALUES ($id, $name, $phone, $email, $address, $postcode, $createdAt, $updatedAt)`,
            {
              $id: customer.id,
              $name: customer.name,
              $phone: customer.phone,
              $email: customer.email,
              $address: customer.address,
              $postcode: customer.postcode,
              $createdAt: customer.createdAt,
              $updatedAt: customer.updatedAt,
            }
          );
        }
      } catch {
        // customers table may not exist on older app builds
      }
    }

    for (const event of manifest.events ?? []) {
      await db.runAsync(
        `INSERT INTO report_events (id, reportId, jobId, kind, label, recipient, createdAt)
         VALUES ($id, $reportId, $jobId, $kind, $label, $recipient, $createdAt)`,
        {
          $id: event.id,
          $reportId: event.reportId,
          $jobId: event.jobId,
          $kind: event.kind,
          $label: event.label,
          $recipient: event.recipient,
          $createdAt: event.createdAt,
        }
      );
    }

    const profile = manifest.businessProfile;
    if (profile) {
      await db.runAsync(
        `INSERT INTO business_profile
           (id, businessName, logoUri, ownerName, email, phone, website, address, registrationNumber, vatNumber, accentColor, footerMessage, coverImageUri, thanksImageUri, imageMask, reviewUrl, reviewProvider, bankName, sortCode, accountNumber, paymentTerms, defaultDueDays, nextInvoiceSequence, updatedAt)
         VALUES (1, $businessName, $logoUri, $ownerName, $email, $phone, $website, $address, $registrationNumber, $vatNumber, $accentColor, $footerMessage, $coverImageUri, $thanksImageUri, $imageMask, $reviewUrl, $reviewProvider, $bankName, $sortCode, $accountNumber, $paymentTerms, $defaultDueDays, $nextInvoiceSequence, $updatedAt)`,
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
          $reviewUrl: (profile as { reviewUrl?: string | null }).reviewUrl ?? null,
          $reviewProvider: (profile as { reviewProvider?: string }).reviewProvider ?? 'google',
          $bankName: (profile as { bankName?: string | null }).bankName ?? null,
          $sortCode: (profile as { sortCode?: string | null }).sortCode ?? null,
          $accountNumber: (profile as { accountNumber?: string | null }).accountNumber ?? null,
          $paymentTerms: (profile as { paymentTerms?: string | null }).paymentTerms ?? null,
          $defaultDueDays: (profile as { defaultDueDays?: number }).defaultDueDays ?? 14,
          $nextInvoiceSequence: (profile as { nextInvoiceSequence?: number }).nextInvoiceSequence ?? 1,
          $updatedAt: profile.updatedAt,
        }
      );
    }
  });
}

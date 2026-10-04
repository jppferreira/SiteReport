import * as Crypto from 'expo-crypto';

import { Job, Photo, Signature, WorkSummary } from '@/models';

/**
 * Produces a stable hash representing everything that would change the
 * rendered PDF. Comparing this against a persisted report's `sourceHash`
 * is how the app knows a report is stale and offers to regenerate it.
 */
export async function computeJobContentHash(
  job: Job,
  photos: Photo[],
  summary: WorkSummary | null,
  signature: Signature | null
): Promise<string> {
  const canonical = {
    jobUpdatedAt: job.updatedAt,
    title: job.title,
    customerName: job.customerName,
    address: job.address,
    jobDate: job.jobDate,
    referenceNumber: job.referenceNumber,
    description: job.description,
    photos: photos
      .map((p) => ({ id: p.id, type: p.type, caption: p.caption, sortOrder: p.sortOrder }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    summary: summary
      ? {
          workCompleted: summary.workCompleted,
          materials: summary.materials,
          recommendations: summary.recommendations,
          notes: summary.notes,
        }
      : null,
    signature: signature ? { signedAt: signature.signedAt, customerName: signature.customerName } : null,
  };

  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify(canonical));
}

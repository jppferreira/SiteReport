import type { SQLiteBindValue } from 'expo-sqlite';

import { getDatabase } from '@/database/client';
import { deleteJobStatements } from '@/database/jobDelete';
import { Job, JobDraft, JobStatus } from '@/models';
import { generateId } from '@/utils/id';
import { todayIsoDate } from '@/utils/format';

export type JobFilter = 'all' | 'draft' | 'complete';

function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    title: row.title as string,
    customerName: (row.customerName as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    jobDate: row.jobDate as string,
    referenceNumber: (row.referenceNumber as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    status: row.status as JobStatus,
    coverPhotoId: (row.coverPhotoId as string | null) ?? null,
    isQuick: Number(row.isQuick ?? 0) === 1,
    customerId: (row.customerId as string | null) ?? null,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export async function createJob(draft: JobDraft): Promise<Job> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const job: Job = {
    id: generateId(),
    title: draft.title.trim(),
    customerName: draft.customerName?.trim() || null,
    address: draft.address?.trim() || null,
    jobDate: draft.jobDate || todayIsoDate(),
    referenceNumber: draft.referenceNumber?.trim() || null,
    description: draft.description?.trim() || null,
    status: 'draft',
    coverPhotoId: null,
    isQuick: draft.isQuick ?? false,
    customerId: draft.customerId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO jobs (
      id, title, customerName, address, jobDate, referenceNumber, description, status, coverPhotoId, isQuick, customerId, createdAt, updatedAt
    ) VALUES (
      $id, $title, $customerName, $address, $jobDate, $referenceNumber, $description, $status, $coverPhotoId, $isQuick, $customerId, $createdAt, $updatedAt
    )`,
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

  return job;
}

export async function createQuickJob(opts: {
  title: string;
  customerId?: string | null;
  customerName?: string | null;
  address?: string | null;
}): Promise<Job> {
  return createJob({
    title: opts.title.trim() || 'Quick job',
    customerName: opts.customerName ?? undefined,
    address: opts.address ?? undefined,
    customerId: opts.customerId ?? null,
    isQuick: true,
  });
}

/** Turns a quick job into a normal job once real site work is captured. */
export async function clearQuickJobFlag(jobId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE jobs SET isQuick = 0, updatedAt = ? WHERE id = ? AND isQuick = 1', [
    new Date().toISOString(),
    jobId,
  ]);
}

/** Removes quick jobs that only existed to hold a lone document. */
export async function maybeDeleteEmptyQuickJob(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job?.isQuick) return;

  const db = await getDatabase();
  const docRow = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM documents WHERE jobId = ?',
    jobId
  );
  if ((docRow?.c ?? 0) > 0) return;

  const photoRow = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM photos WHERE jobId = ?', jobId);
  if ((photoRow?.c ?? 0) > 0) return;

  const summaryRow = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT notes, workCompleted, materials, recommendations FROM work_summaries WHERE jobId = ?',
    jobId
  );
  if (summaryRow) {
    const hasNotes = [summaryRow.notes, summaryRow.workCompleted, summaryRow.materials, summaryRow.recommendations].some(
      (value) => typeof value === 'string' && value.trim().length > 0
    );
    if (hasNotes) return;
  }

  await deleteJob(jobId);
}

export async function updateJob(
  id: string,
  patch: Partial<JobDraft & { status: JobStatus; isQuick: boolean; customerId: string | null }>
): Promise<void> {
  const db = await getDatabase();
  const existing = await getJob(id);
  if (!existing) return;

  const next: Job = {
    ...existing,
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.customerName !== undefined ? { customerName: patch.customerName.trim() || null } : {}),
    ...(patch.address !== undefined ? { address: patch.address.trim() || null } : {}),
    ...(patch.jobDate !== undefined ? { jobDate: patch.jobDate } : {}),
    ...(patch.referenceNumber !== undefined ? { referenceNumber: patch.referenceNumber.trim() || null } : {}),
    ...(patch.description !== undefined ? { description: patch.description.trim() || null } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.isQuick !== undefined ? { isQuick: patch.isQuick } : {}),
    ...(patch.customerId !== undefined ? { customerId: patch.customerId } : {}),
    updatedAt: new Date().toISOString(),
  };

  await db.runAsync(
    `UPDATE jobs SET title=$title, customerName=$customerName, address=$address, jobDate=$jobDate,
       referenceNumber=$referenceNumber, description=$description, status=$status, isQuick=$isQuick,
       customerId=$customerId, updatedAt=$updatedAt
     WHERE id=$id`,
    {
      $id: next.id,
      $title: next.title,
      $customerName: next.customerName,
      $address: next.address,
      $jobDate: next.jobDate,
      $referenceNumber: next.referenceNumber,
      $description: next.description,
      $status: next.status,
      $isQuick: next.isQuick ? 1 : 0,
      $customerId: next.customerId,
      $updatedAt: next.updatedAt,
    }
  );
}

/** Saves which photo leads this job on the reports list and the report cover. */
export async function setCoverPhoto(jobId: string, photoId: string | null): Promise<void> {
  const db = await getDatabase();
  if (photoId) {
    const photo = await db.getFirstAsync<{ jobId: string }>('SELECT jobId FROM photos WHERE id = ?', [photoId]);
    if (!photo || photo.jobId !== jobId) return;
  }
  await db.runAsync('UPDATE jobs SET coverPhotoId = ?, updatedAt = ? WHERE id = ?', [
    photoId,
    new Date().toISOString(),
    jobId,
  ]);
}

export async function getJob(id: string): Promise<Job | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM jobs WHERE id = ?', [id]);
  return row ? rowToJob(row) : null;
}

export async function listJobs(filter: JobFilter = 'all', search = ''): Promise<Job[]> {
  const db = await getDatabase();
  const clauses: string[] = [];
  const params: Record<string, SQLiteBindValue> = {};

  if (filter === 'draft') {
    clauses.push("status != 'complete'");
  } else if (filter === 'complete') {
    clauses.push("status = 'complete'");
  }

  const trimmedSearch = search.trim();
  if (trimmedSearch.length > 0) {
    clauses.push('(title LIKE $search OR customerName LIKE $search OR address LIKE $search)');
    params.$search = `%${trimmedSearch}%`;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM jobs ${where} ORDER BY updatedAt DESC`,
    params
  );
  return rows.map(rowToJob);
}

export async function deleteJob(id: string): Promise<void> {
  const db = await getDatabase();
  const statements = deleteJobStatements();
  await db.withTransactionAsync(async () => {
    for (const statement of statements) {
      await db.runAsync(statement, [id]);
    }
  });
}

export async function duplicateJob(id: string): Promise<Job | null> {
  const original = await getJob(id);
  if (!original) return null;
  return createJob({
    title: `${original.title} (copy)`,
    customerName: original.customerName ?? undefined,
    address: original.address ?? undefined,
    jobDate: todayIsoDate(),
    referenceNumber: undefined,
    description: original.description ?? undefined,
    customerId: original.customerId ?? undefined,
  });
}
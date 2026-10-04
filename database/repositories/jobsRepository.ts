import type { SQLiteBindValue } from 'expo-sqlite';

import { getDatabase } from '@/database/client';
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
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO jobs (id, title, customerName, address, jobDate, referenceNumber, description, status, createdAt, updatedAt)
     VALUES ($id, $title, $customerName, $address, $jobDate, $referenceNumber, $description, $status, $createdAt, $updatedAt)`,
    {
      $id: job.id,
      $title: job.title,
      $customerName: job.customerName,
      $address: job.address,
      $jobDate: job.jobDate,
      $referenceNumber: job.referenceNumber,
      $description: job.description,
      $status: job.status,
      $createdAt: job.createdAt,
      $updatedAt: job.updatedAt,
    }
  );

  return job;
}

export async function updateJob(id: string, patch: Partial<JobDraft & { status: JobStatus }>): Promise<void> {
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
    updatedAt: new Date().toISOString(),
  };

  await db.runAsync(
    `UPDATE jobs SET title=$title, customerName=$customerName, address=$address, jobDate=$jobDate,
       referenceNumber=$referenceNumber, description=$description, status=$status, updatedAt=$updatedAt
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
      $updatedAt: next.updatedAt,
    }
  );
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
  await db.runAsync('DELETE FROM jobs WHERE id = ?', [id]);
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
  });
}

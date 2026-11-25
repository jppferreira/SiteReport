import { getDatabase } from '@/database/client';
import * as jobsRepository from '@/database/repositories/jobsRepository';
import {
  coerceWorkSummaryDocumentFields,
  DEFAULT_DOCUMENT_TYPE,
  DocumentType,
  parsePricing,
  serializePricing,
  WorkSummary,
} from '@/models';

function rowToSummary(row: Record<string, unknown>): WorkSummary {
  const doc = coerceWorkSummaryDocumentFields(row);
  return {
    jobId: row.jobId as string,
    workCompleted: (row.workCompleted as string | null) ?? null,
    materials: (row.materials as string | null) ?? null,
    recommendations: (row.recommendations as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    pricing: parsePricing(row.pricingJson),
    documentType: doc.documentType,
    invoiceNumber: doc.invoiceNumber,
    updatedAt: row.updatedAt as string,
  };
}

export async function getWorkSummary(jobId: string): Promise<WorkSummary | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM work_summaries WHERE jobId = ?',
    [jobId]
  );
  return row ? rowToSummary(row) : null;
}

export async function saveWorkSummary(
  jobId: string,
  patch: Partial<
    Pick<
      WorkSummary,
      'workCompleted' | 'materials' | 'recommendations' | 'notes' | 'pricing' | 'documentType' | 'invoiceNumber'
    >
  >
): Promise<WorkSummary> {
  const db = await getDatabase();
  const existing = await getWorkSummary(jobId);
  const next: WorkSummary = {
    jobId,
    workCompleted: patch.workCompleted !== undefined ? patch.workCompleted : existing?.workCompleted ?? null,
    materials: patch.materials !== undefined ? patch.materials : existing?.materials ?? null,
    recommendations:
      patch.recommendations !== undefined ? patch.recommendations : existing?.recommendations ?? null,
    notes: patch.notes !== undefined ? patch.notes : existing?.notes ?? null,
    pricing: patch.pricing !== undefined ? patch.pricing : existing?.pricing ?? { enabled: false, lines: [] },
    documentType: patch.documentType !== undefined ? patch.documentType : existing?.documentType ?? DEFAULT_DOCUMENT_TYPE,
    invoiceNumber: patch.invoiceNumber !== undefined ? patch.invoiceNumber : existing?.invoiceNumber ?? null,
    updatedAt: new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO work_summaries (jobId, workCompleted, materials, recommendations, notes, pricingJson, documentType, invoiceNumber, updatedAt)
     VALUES ($jobId, $workCompleted, $materials, $recommendations, $notes, $pricingJson, $documentType, $invoiceNumber, $updatedAt)
     ON CONFLICT(jobId) DO UPDATE SET
       workCompleted = excluded.workCompleted,
       materials = excluded.materials,
       recommendations = excluded.recommendations,
       notes = excluded.notes,
       pricingJson = excluded.pricingJson,
       documentType = excluded.documentType,
       invoiceNumber = excluded.invoiceNumber,
       updatedAt = excluded.updatedAt`,
    {
      $jobId: next.jobId,
      $workCompleted: next.workCompleted,
      $materials: next.materials,
      $recommendations: next.recommendations,
      $notes: next.notes,
      $pricingJson: serializePricing(next.pricing),
      $documentType: next.documentType,
      $invoiceNumber: next.invoiceNumber,
      $updatedAt: next.updatedAt,
    }
  );

  const noteFields = [
    patch.notes,
    patch.workCompleted,
    patch.materials,
    patch.recommendations,
  ];
  if (noteFields.some((value) => typeof value === 'string' && value.trim().length > 0)) {
    await jobsRepository.clearQuickJobFlag(jobId);
  }

  return next;
}

export async function deleteWorkSummary(jobId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM work_summaries WHERE jobId = ?', [jobId]);
}

export async function ensureInvoiceNumber(jobId: string, allocate: () => Promise<string>): Promise<string> {
  const existing = await getWorkSummary(jobId);
  if (existing?.invoiceNumber) return existing.invoiceNumber;
  const number = await allocate();
  await saveWorkSummary(jobId, { invoiceNumber: number, documentType: (existing?.documentType ?? 'invoice') as DocumentType });
  return number;
}

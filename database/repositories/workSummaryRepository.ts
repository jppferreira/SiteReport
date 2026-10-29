import { getDatabase } from '@/database/client';
import { parsePricing, serializePricing, WorkSummary } from '@/models';

function rowToSummary(row: Record<string, unknown>): WorkSummary {
  return {
    jobId: row.jobId as string,
    workCompleted: (row.workCompleted as string | null) ?? null,
    materials: (row.materials as string | null) ?? null,
    recommendations: (row.recommendations as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    pricing: parsePricing(row.pricingJson),
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
  patch: Partial<Pick<WorkSummary, 'workCompleted' | 'materials' | 'recommendations' | 'notes' | 'pricing'>>
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
    updatedAt: new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO work_summaries (jobId, workCompleted, materials, recommendations, notes, pricingJson, updatedAt)
     VALUES ($jobId, $workCompleted, $materials, $recommendations, $notes, $pricingJson, $updatedAt)
     ON CONFLICT(jobId) DO UPDATE SET
       workCompleted = excluded.workCompleted,
       materials = excluded.materials,
       recommendations = excluded.recommendations,
       notes = excluded.notes,
       pricingJson = excluded.pricingJson,
       updatedAt = excluded.updatedAt`,
    {
      $jobId: next.jobId,
      $workCompleted: next.workCompleted,
      $materials: next.materials,
      $recommendations: next.recommendations,
      $notes: next.notes,
      $pricingJson: serializePricing(next.pricing),
      $updatedAt: next.updatedAt,
    }
  );

  return next;
}

export async function deleteWorkSummary(jobId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM work_summaries WHERE jobId = ?', [jobId]);
}

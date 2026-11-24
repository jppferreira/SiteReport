import { getDatabase } from '@/database/client';
import {
  buildChecklistItems,
  checklistTemplateById,
  JobChecklist,
  JobChecklistItem,
  JobChecklistTemplateId,
  normalizeChecklistTemplateId,
  parseChecklistItems,
  serializeChecklistItems,
} from '@/models';
import { generateId } from '@/utils/id';

function mapRow(row: Record<string, unknown>): JobChecklist {
  return {
    jobId: String(row.jobId),
    templateId: normalizeChecklistTemplateId(row.templateId),
    includeInPdf: Number(row.includeInPdf) === 1,
    items: parseChecklistItems(typeof row.itemsJson === 'string' ? row.itemsJson : null),
    updatedAt: String(row.updatedAt),
  };
}

export async function getChecklist(jobId: string): Promise<JobChecklist | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT jobId, templateId, includeInPdf, itemsJson, updatedAt FROM job_checklists WHERE jobId = ?',
    [jobId]
  );
  return row ? mapRow(row) : null;
}

async function upsert(checklist: JobChecklist): Promise<JobChecklist> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO job_checklists (jobId, templateId, includeInPdf, itemsJson, updatedAt)
     VALUES ($jobId, $templateId, $includeInPdf, $itemsJson, $updatedAt)
     ON CONFLICT(jobId) DO UPDATE SET
       templateId = $templateId,
       includeInPdf = $includeInPdf,
       itemsJson = $itemsJson,
       updatedAt = $updatedAt`,
    {
      $jobId: checklist.jobId,
      $templateId: checklist.templateId,
      $includeInPdf: checklist.includeInPdf ? 1 : 0,
      $itemsJson: serializeChecklistItems(checklist.items),
      $updatedAt: checklist.updatedAt,
    }
  );
  return checklist;
}

export async function ensureChecklist(jobId: string, templateId: JobChecklistTemplateId = 'boiler'): Promise<JobChecklist> {
  const existing = await getChecklist(jobId);
  if (existing) return existing;
  const template = checklistTemplateById(templateId) ?? checklistTemplateById('boiler')!;
  const now = new Date().toISOString();
  return upsert({
    jobId,
    templateId: template.id,
    includeInPdf: true,
    items: buildChecklistItems(template.items, generateId),
    updatedAt: now,
  });
}

export async function applyTemplate(jobId: string, templateId: JobChecklistTemplateId): Promise<JobChecklist> {
  const template = checklistTemplateById(templateId);
  if (!template) throw new Error('Unknown checklist template');
  const existing = await getChecklist(jobId);
  const now = new Date().toISOString();
  return upsert({
    jobId,
    templateId: template.id,
    includeInPdf: existing?.includeInPdf ?? true,
    items: buildChecklistItems(template.items, generateId),
    updatedAt: now,
  });
}

export async function setItems(jobId: string, items: JobChecklistItem[]): Promise<JobChecklist> {
  const existing = await ensureChecklist(jobId);
  return upsert({
    ...existing,
    items,
    updatedAt: new Date().toISOString(),
  });
}

export async function setIncludeInPdf(jobId: string, includeInPdf: boolean): Promise<JobChecklist> {
  const existing = await ensureChecklist(jobId);
  return upsert({
    ...existing,
    includeInPdf,
    updatedAt: new Date().toISOString(),
  });
}

export async function toggleItem(jobId: string, itemId: string): Promise<JobChecklist> {
  const existing = await ensureChecklist(jobId);
  const items = existing.items.map((item) =>
    item.id === itemId ? { ...item, checked: !item.checked } : item
  );
  return upsert({
    ...existing,
    items,
    updatedAt: new Date().toISOString(),
  });
}

export async function addItem(jobId: string, label: string): Promise<JobChecklist> {
  const existing = await ensureChecklist(jobId);
  const trimmed = label.trim().slice(0, 200);
  if (!trimmed) return existing;
  return upsert({
    ...existing,
    templateId: existing.templateId === 'custom' ? 'custom' : existing.templateId,
    items: [...existing.items, { id: generateId(), label: trimmed, checked: false }],
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteChecklist(jobId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM job_checklists WHERE jobId = ?', [jobId]);
}

export async function listAllChecklists(): Promise<JobChecklist[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT jobId, templateId, includeInPdf, itemsJson, updatedAt FROM job_checklists'
  );
  return rows.map(mapRow);
}

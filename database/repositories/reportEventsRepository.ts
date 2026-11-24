import { getDatabase } from '@/database/client';
import { normalizeReportEventKind, ReportEvent, ReportEventKind } from '@/models';
import { generateId } from '@/utils/id';

function mapRow(row: Record<string, unknown>): ReportEvent {
  return {
    id: String(row.id),
    reportId: String(row.reportId),
    jobId: String(row.jobId),
    kind: normalizeReportEventKind(row.kind),
    label: String(row.label),
    recipient: typeof row.recipient === 'string' && row.recipient.length > 0 ? row.recipient : null,
    createdAt: String(row.createdAt),
  };
}

export async function listEventsForJob(jobId: string): Promise<ReportEvent[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT id, reportId, jobId, kind, label, recipient, createdAt
     FROM report_events
     WHERE jobId = ?
     ORDER BY createdAt DESC
     LIMIT 40`,
    [jobId]
  );
  return rows.map(mapRow);
}

export async function listEventsForReport(reportId: string): Promise<ReportEvent[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT id, reportId, jobId, kind, label, recipient, createdAt
     FROM report_events
     WHERE reportId = ?
     ORDER BY createdAt DESC
     LIMIT 40`,
    [reportId]
  );
  return rows.map(mapRow);
}

export async function listAllEvents(): Promise<ReportEvent[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT id, reportId, jobId, kind, label, recipient, createdAt
     FROM report_events
     ORDER BY createdAt ASC`
  );
  return rows.map(mapRow);
}

export async function addEvent(input: {
  reportId: string;
  jobId: string;
  kind: ReportEventKind;
  label: string;
  recipient?: string | null;
}): Promise<ReportEvent> {
  const db = await getDatabase();
  const event: ReportEvent = {
    id: generateId(),
    reportId: input.reportId,
    jobId: input.jobId,
    kind: input.kind,
    label: input.label.slice(0, 200),
    recipient: input.recipient?.trim() || null,
    createdAt: new Date().toISOString(),
  };
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
  return event;
}

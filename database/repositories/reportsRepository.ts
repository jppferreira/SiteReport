import { getDatabase } from '@/database/client';
import { Report } from '@/models';
import { generateId } from '@/utils/id';

function rowToReport(row: Record<string, unknown>): Report {
  return {
    id: row.id as string,
    jobId: row.jobId as string,
    localPdfUri: row.localPdfUri as string,
    fileName: row.fileName as string,
    generatedAt: row.generatedAt as string,
    fileSize: row.fileSize as number,
    version: row.version as number,
    sourceHash: row.sourceHash as string,
  };
}

export type NewReport = Omit<Report, 'id' | 'generatedAt' | 'version'>;

export async function createReport(report: NewReport): Promise<Report> {
  const db = await getDatabase();
  const existingForJob = await listReportsForJob(report.jobId);
  const record: Report = {
    id: generateId(),
    jobId: report.jobId,
    localPdfUri: report.localPdfUri,
    fileName: report.fileName,
    generatedAt: new Date().toISOString(),
    fileSize: report.fileSize,
    version: existingForJob.length + 1,
    sourceHash: report.sourceHash,
  };

  await db.runAsync(
    `INSERT INTO reports (id, jobId, localPdfUri, fileName, generatedAt, fileSize, version, sourceHash)
     VALUES ($id, $jobId, $localPdfUri, $fileName, $generatedAt, $fileSize, $version, $sourceHash)`,
    {
      $id: record.id,
      $jobId: record.jobId,
      $localPdfUri: record.localPdfUri,
      $fileName: record.fileName,
      $generatedAt: record.generatedAt,
      $fileSize: record.fileSize,
      $version: record.version,
      $sourceHash: record.sourceHash,
    }
  );

  return record;
}

export async function listAllReports(): Promise<Report[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM reports ORDER BY generatedAt DESC');
  return rows.map(rowToReport);
}

export async function listReportsForJob(jobId: string): Promise<Report[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM reports WHERE jobId = ? ORDER BY generatedAt DESC',
    [jobId]
  );
  return rows.map(rowToReport);
}

export async function getLatestReportForJob(jobId: string): Promise<Report | null> {
  const reports = await listReportsForJob(jobId);
  return reports[0] ?? null;
}

export async function getReport(id: string): Promise<Report | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM reports WHERE id = ?', [id]);
  return row ? rowToReport(row) : null;
}

export async function deleteReport(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM reports WHERE id = ?', [id]);
}

export async function deleteReportsForJob(jobId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM reports WHERE jobId = ?', [jobId]);
}

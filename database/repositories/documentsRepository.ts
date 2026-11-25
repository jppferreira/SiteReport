import { getDatabase } from '@/database/client';
import * as businessProfileRepository from '@/database/repositories/businessProfileRepository';
import * as customersRepository from '@/database/repositories/customersRepository';
import * as jobsRepository from '@/database/repositories/jobsRepository';
import * as workSummaryRepository from '@/database/repositories/workSummaryRepository';
import {
  DocumentKind,
  DocumentStatus,
  DocumentType,
  dueDateFromJob,
  InvoiceStatus,
  normalizeDocumentKind,
  normalizeDocumentStatus,
  quoteValidUntilFromCreated,
  serializePricing,
  TradeDocument,
  type Report,
} from '@/models';
import { generateId } from '@/utils/id';
import { todayIsoDate } from '@/utils/format';

/** Dynamic import so expo-notifications never loads during SQLite boot. */
function refreshReminders(documentId: string): void {
  void (async () => {
    try {
      const { syncRemindersForDocument } = await import('@/services/documentReminders');
      const doc = await getDocument(documentId);
      if (doc) await syncRemindersForDocument(doc);
    } catch {
      // Reminders optional — never block document writes.
    }
  })();
}

function dropReminders(documentId: string): void {
  void (async () => {
    try {
      const { cancelDocumentReminders } = await import('@/services/documentReminders');
      await cancelDocumentReminders(documentId);
    } catch {
      // ignore
    }
  })();
}

function rowToDocument(row: Record<string, unknown>): TradeDocument {
  const kind = normalizeDocumentKind(row.kind);
  return {
    id: row.id as string,
    jobId: row.jobId as string,
    kind,
    number: (row.number as string | null) ?? null,
    status: normalizeDocumentStatus(kind, row.status),
    title: (row.title as string | null) ?? null,
    totalPence: row.totalPence == null ? null : Number(row.totalPence),
    netPence: row.netPence == null ? null : Number(row.netPence),
    vatPence: row.vatPence == null ? null : Number(row.vatPence),
    dueDate: (row.dueDate as string | null) ?? null,
    validUntil: (row.validUntil as string | null) ?? null,
    sentAt: (row.sentAt as string | null) ?? null,
    paidAt: (row.paidAt as string | null) ?? null,
    acceptedAt: (row.acceptedAt as string | null) ?? null,
    declinedAt: (row.declinedAt as string | null) ?? null,
    paidMethod: (row.paidMethod as string | null) ?? null,
    paidAmountPence: row.paidAmountPence == null ? null : Number(row.paidAmountPence),
    sourceDocumentId: (row.sourceDocumentId as string | null) ?? null,
    attachedReportId: (row.attachedReportId as string | null) ?? null,
    pricingSnapshotJson: (row.pricingSnapshotJson as string | null) ?? null,
    reportId: (row.reportId as string | null) ?? null,
    localPdfUri: (row.localPdfUri as string | null) ?? null,
    fileName: (row.fileName as string | null) ?? null,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export type NewTradeDocument = Pick<TradeDocument, 'jobId' | 'kind'> &
  Partial<
    Omit<TradeDocument, 'id' | 'jobId' | 'kind' | 'createdAt' | 'updatedAt' | 'status'> & {
      status: DocumentStatus;
    }
  >;

async function insertDocument(record: TradeDocument): Promise<void> {
  const db = await getDatabase();
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
      $id: record.id,
      $jobId: record.jobId,
      $kind: record.kind,
      $number: record.number,
      $status: record.status,
      $title: record.title,
      $totalPence: record.totalPence,
      $netPence: record.netPence,
      $vatPence: record.vatPence,
      $dueDate: record.dueDate,
      $validUntil: record.validUntil,
      $sentAt: record.sentAt,
      $paidAt: record.paidAt,
      $acceptedAt: record.acceptedAt,
      $declinedAt: record.declinedAt,
      $paidMethod: record.paidMethod,
      $paidAmountPence: record.paidAmountPence,
      $sourceDocumentId: record.sourceDocumentId,
      $attachedReportId: record.attachedReportId,
      $pricingSnapshotJson: record.pricingSnapshotJson,
      $reportId: record.reportId,
      $localPdfUri: record.localPdfUri,
      $fileName: record.fileName,
      $createdAt: record.createdAt,
      $updatedAt: record.updatedAt,
    }
  );
}

function defaultStatusForKind(kind: DocumentKind): DocumentStatus {
  if (kind === 'report') return 'draft';
  return 'draft';
}

export type StandaloneDocumentInput = {
  kind: DocumentKind;
  customerId?: string;
  jobId?: string;
  title?: string;
};

export async function createStandaloneDocument(input: StandaloneDocumentInput): Promise<TradeDocument> {
  let jobId = input.jobId;
  let title = input.title?.trim() || null;

  if (jobId) {
    const job = await jobsRepository.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    title = title ?? job.title;
  } else {
    let customerName: string | null = null;
    let address: string | null = null;
    if (input.customerId) {
      const customer = await customersRepository.getCustomer(input.customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }
      customerName = customer.name;
      address = customer.address;
      title = title ?? customer.name;
    }
    const quickJob = await jobsRepository.createQuickJob({
      title: title ?? customerName ?? 'Quick job',
      customerId: input.customerId ?? null,
      customerName,
      address,
    });
    jobId = quickJob.id;
    title = title ?? quickJob.title;
  }

  return createDocument({
    jobId,
    kind: input.kind,
    title,
  });
}

export async function createDocument(input: NewTradeDocument): Promise<TradeDocument> {
  const now = new Date().toISOString();
  const profile = await businessProfileRepository.getBusinessProfile();
  let number = input.number ?? null;
  if (number == null && input.kind === 'quote') {
    number = await businessProfileRepository.allocateQuoteNumber();
  }
  if (number == null && input.kind === 'invoice') {
    number = await businessProfileRepository.allocateInvoiceNumber();
  }

  const dueDate =
    input.dueDate ??
    (input.kind === 'invoice' ? dueDateFromJob(todayIsoDate(), profile.defaultDueDays) : null);

  const record: TradeDocument = {
    id: generateId(),
    jobId: input.jobId,
    kind: input.kind,
    number,
    status: input.status ?? defaultStatusForKind(input.kind),
    title: input.title ?? null,
    totalPence: input.totalPence ?? null,
    netPence: input.netPence ?? null,
    vatPence: input.vatPence ?? null,
    dueDate,
    validUntil:
      input.validUntil ??
      (input.kind === 'quote' ? quoteValidUntilFromCreated(now, profile.defaultQuoteValidityDays) : null),
    sentAt: input.sentAt ?? null,
    paidAt: input.paidAt ?? null,
    acceptedAt: input.acceptedAt ?? null,
    declinedAt: input.declinedAt ?? null,
    paidMethod: input.paidMethod ?? null,
    paidAmountPence: input.paidAmountPence ?? null,
    sourceDocumentId: input.sourceDocumentId ?? null,
    attachedReportId: input.attachedReportId ?? null,
    pricingSnapshotJson: input.pricingSnapshotJson ?? null,
    reportId: input.reportId ?? null,
    localPdfUri: input.localPdfUri ?? null,
    fileName: input.fileName ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await insertDocument(record);
  return record;
}

export async function getDocument(id: string): Promise<TradeDocument | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM documents WHERE id = ?', id);
  return row ? rowToDocument(row) : null;
}

export async function listAllDocuments(): Promise<TradeDocument[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM documents ORDER BY updatedAt DESC');
  return rows.map(rowToDocument);
}

export async function listDocumentsForJob(jobId: string): Promise<TradeDocument[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM documents WHERE jobId = ? ORDER BY createdAt DESC',
    jobId
  );
  return rows.map(rowToDocument);
}

export async function listDocumentsByKind(kind: DocumentKind): Promise<TradeDocument[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM documents WHERE kind = ? ORDER BY updatedAt DESC',
    kind
  );
  return rows.map(rowToDocument);
}

export type JobDocumentKindSummary = {
  id: string;
  status: DocumentStatus;
  updatedAt: string;
};

export type JobDocumentSummary = {
  quote: JobDocumentKindSummary | null;
  report: JobDocumentKindSummary | null;
  invoice: JobDocumentKindSummary | null;
};

/** Latest document of each kind per job (by updatedAt). */
export async function getJobDocumentSummaries(
  jobIds: string[]
): Promise<Record<string, JobDocumentSummary>> {
  const empty = (): JobDocumentSummary => ({ quote: null, report: null, invoice: null });
  const result: Record<string, JobDocumentSummary> = {};
  for (const jobId of jobIds) result[jobId] = empty();
  if (jobIds.length === 0) return result;

  const db = await getDatabase();
  const placeholders = jobIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM documents WHERE jobId IN (${placeholders}) ORDER BY updatedAt DESC`,
    jobIds
  );

  for (const row of rows) {
    const doc = rowToDocument(row);
    const summary = result[doc.jobId];
    if (!summary) continue;
    if (summary[doc.kind]) continue;
    summary[doc.kind] = { id: doc.id, status: doc.status, updatedAt: doc.updatedAt };
  }

  return result;
}

/** Which document kinds exist anywhere in the account. */
export async function getDocumentKindPresence(): Promise<Record<DocumentKind, boolean>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ kind: string }>('SELECT DISTINCT kind FROM documents');
  const presence: Record<DocumentKind, boolean> = { quote: false, report: false, invoice: false };
  for (const row of rows) {
    const kind = normalizeDocumentKind(row.kind);
    presence[kind] = true;
  }
  return presence;
}

export async function updateDocumentStatus(id: string, status: DocumentStatus): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE documents SET status = ?, updatedAt = ? WHERE id = ?', status, now, id);
}

export async function markSent(id: string): Promise<void> {
  const doc = await getDocument(id);
  if (!doc) return;
  const sentAt = new Date().toISOString();
  let status: DocumentStatus = 'sent';
  if (doc.kind === 'invoice' && doc.status === 'draft') {
    status = 'unpaid';
  }
  const db = await getDatabase();
  await db.runAsync('UPDATE documents SET status = ?, sentAt = ?, updatedAt = ? WHERE id = ?', status, sentAt, sentAt, id);
  refreshReminders(id);
}

export async function markAccepted(id: string): Promise<void> {
  const acceptedAt = new Date().toISOString();
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE documents SET status = ?, acceptedAt = ?, updatedAt = ? WHERE id = ? AND kind = ?',
    'accepted',
    acceptedAt,
    acceptedAt,
    id,
    'quote'
  );
  dropReminders(id);
}

export async function markDeclined(id: string): Promise<void> {
  const declinedAt = new Date().toISOString();
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE documents SET status = ?, declinedAt = ?, updatedAt = ? WHERE id = ? AND kind = ?',
    'declined',
    declinedAt,
    declinedAt,
    id,
    'quote'
  );
  dropReminders(id);
}

export async function markPaid(
  id: string,
  opts?: { paidMethod?: string | null; paidAmountPence?: number | null }
): Promise<void> {
  const paidAt = new Date().toISOString();
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE documents SET status = ?, paidAt = ?, paidMethod = COALESCE(?, paidMethod),
       paidAmountPence = COALESCE(?, paidAmountPence), updatedAt = ?
     WHERE id = ? AND kind = 'invoice'`,
    'paid',
    paidAt,
    opts?.paidMethod ?? null,
    opts?.paidAmountPence ?? null,
    paidAt,
    id
  );
  dropReminders(id);
}

export async function updateDocumentPdf(
  id: string,
  patch: { localPdfUri: string; fileName: string; reportId?: string | null }
): Promise<void> {
  const now = new Date().toISOString();
  const db = await getDatabase();
  if (patch.reportId !== undefined) {
    await db.runAsync(
      'UPDATE documents SET localPdfUri = ?, fileName = ?, reportId = ?, updatedAt = ? WHERE id = ?',
      patch.localPdfUri,
      patch.fileName,
      patch.reportId,
      now,
      id
    );
    return;
  }
  await db.runAsync(
    'UPDATE documents SET localPdfUri = ?, fileName = ?, updatedAt = ? WHERE id = ?',
    patch.localPdfUri,
    patch.fileName,
    now,
    id
  );
}

function latestDocumentOfKind(documents: TradeDocument[], kind: DocumentKind): TradeDocument | undefined {
  return documents.find((doc) => doc.kind === kind);
}

/** Attaches a newly generated report PDF to job documents (report + quote/invoice when applicable). */
export async function syncGeneratedReportPdf(
  jobId: string,
  report: Pick<Report, 'id' | 'localPdfUri' | 'fileName'>,
  documentType: DocumentType
): Promise<void> {
  const documents = await listDocumentsForJob(jobId);
  const pdfPatch = {
    localPdfUri: report.localPdfUri,
    fileName: report.fileName,
    reportId: report.id,
  };

  let reportDoc = latestDocumentOfKind(documents, 'report');
  if (!reportDoc) {
    reportDoc = await createDocument({ jobId, kind: 'report' });
  }
  await updateDocumentPdf(reportDoc.id, pdfPatch);

  if (documentType === 'quote' || documentType === 'invoice') {
    let tradeDoc = latestDocumentOfKind(documents, documentType);
    if (!tradeDoc) {
      tradeDoc = await createDocument({ jobId, kind: documentType });
    }
    await updateDocumentPdf(tradeDoc.id, pdfPatch);
  }
}

export async function deleteDocument(id: string): Promise<void> {
  const doc = await getDocument(id);
  if (!doc) return;
  const db = await getDatabase();
  await db.runAsync('DELETE FROM documents WHERE id = ?', id);
  dropReminders(id);
  await jobsRepository.maybeDeleteEmptyQuickJob(doc.jobId);
}

export type ConvertQuoteToInvoiceOptions = {
  copyPricing?: boolean;
  attachReportId?: string | null;
  dueDays?: number;
};

export async function convertQuoteToInvoice(
  quoteId: string,
  opts: ConvertQuoteToInvoiceOptions = {}
): Promise<TradeDocument> {
  const quote = await getDocument(quoteId);
  if (!quote || quote.kind !== 'quote') {
    throw new Error('Quote not found');
  }

  const profile = await businessProfileRepository.getBusinessProfile();
  const invoiceNumber = await businessProfileRepository.allocateInvoiceNumber();
  const now = new Date().toISOString();
  const job = await jobsRepository.getJob(quote.jobId);

  let pricingSnapshotJson = quote.pricingSnapshotJson;
  let netPence = quote.netPence;
  let vatPence = quote.vatPence;
  let totalPence = quote.totalPence;

  if (opts.copyPricing !== false) {
    if (!pricingSnapshotJson) {
      const summary = await workSummaryRepository.getWorkSummary(quote.jobId);
      if (summary?.pricing.enabled) {
        pricingSnapshotJson = serializePricing(summary.pricing);
      }
    }
  } else {
    pricingSnapshotJson = null;
    netPence = null;
    vatPence = null;
    totalPence = null;
  }

  const dueDays = opts.dueDays ?? profile.defaultDueDays;
  const dueDate = job ? dueDateFromJob(job.jobDate, dueDays) : null;

  const invoice: TradeDocument = {
    id: generateId(),
    jobId: quote.jobId,
    kind: 'invoice',
    number: invoiceNumber,
    status: 'draft' satisfies InvoiceStatus,
    title: quote.title,
    totalPence,
    netPence,
    vatPence,
    dueDate,
    validUntil: null,
    sentAt: null,
    paidAt: null,
    acceptedAt: null,
    declinedAt: null,
    paidMethod: null,
    paidAmountPence: null,
    sourceDocumentId: quote.id,
    attachedReportId: opts.attachReportId ?? quote.attachedReportId,
    pricingSnapshotJson,
    reportId: null,
    localPdfUri: null,
    fileName: null,
    createdAt: now,
    updatedAt: now,
  };

  await insertDocument(invoice);

  const acceptedAt = quote.status === 'accepted' ? quote.acceptedAt : now;
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE documents SET status = ?, acceptedAt = COALESCE(acceptedAt, ?), updatedAt = ? WHERE id = ?',
    'accepted',
    acceptedAt,
    now,
    quoteId
  );

  dropReminders(quoteId);
  return invoice;
}
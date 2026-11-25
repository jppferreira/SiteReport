import { strToU8, zipSync } from 'fflate';
import { Platform } from 'react-native';

import { documentsRepository, jobsRepository } from '@/database';
import { customersRepository } from '@/database';
import type { Job, TradeDocument } from '@/models';
import { documentStatusLabel, effectiveStatus } from '@/models';
import { readBytes, temporaryFilePath, writeBytes } from '@/services/fileService';
import { shareFile } from '@/services/shareService';
import { t } from '@/i18n';

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return '';
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function pounds(pence: number | null | undefined): string {
  if (pence == null || !Number.isFinite(pence)) return '';
  return (pence / 100).toFixed(2);
}

function rowInvoice(doc: TradeDocument, job: Job | undefined): string {
  const status = documentStatusLabel(doc.kind, effectiveStatus(doc));
  return [
    csvEscape(doc.number),
    csvEscape(job?.customerName ?? ''),
    csvEscape(job?.title ?? ''),
    csvEscape(doc.createdAt.slice(0, 10)),
    csvEscape(doc.dueDate),
    csvEscape(doc.sentAt?.slice(0, 10) ?? ''),
    csvEscape(pounds(doc.netPence)),
    csvEscape(pounds(doc.vatPence)),
    csvEscape(pounds(doc.totalPence)),
    csvEscape(status),
    csvEscape(doc.paidAt?.slice(0, 10) ?? ''),
  ].join(',');
}

function rowQuote(doc: TradeDocument, job: Job | undefined): string {
  const status = documentStatusLabel(doc.kind, effectiveStatus(doc));
  return [
    csvEscape(doc.number),
    csvEscape(job?.customerName ?? ''),
    csvEscape(job?.title ?? ''),
    csvEscape(doc.createdAt.slice(0, 10)),
    csvEscape(doc.validUntil),
    csvEscape(doc.sentAt?.slice(0, 10) ?? ''),
    csvEscape(pounds(doc.netPence)),
    csvEscape(pounds(doc.vatPence)),
    csvEscape(pounds(doc.totalPence)),
    csvEscape(status),
    csvEscape(doc.acceptedAt?.slice(0, 10) ?? ''),
  ].join(',');
}

const INVOICE_HEADER =
  'number,customer,job,created,due,sent,net,vat,total,status,paid_date';
const QUOTE_HEADER =
  'number,customer,job,created,valid_until,sent,net,vat,total,status,accepted_date';

export async function buildAccountantExportZip(): Promise<Uint8Array> {
  const documents = await documentsRepository.listAllDocuments();
  const jobs = await jobsRepository.listJobs('all');
  const jobById = new Map(jobs.map((job) => [job.id, job]));

  const invoices = documents.filter((doc) => doc.kind === 'invoice');
  const quotes = documents.filter((doc) => doc.kind === 'quote');

  const invoiceCsv = [INVOICE_HEADER, ...invoices.map((doc) => rowInvoice(doc, jobById.get(doc.jobId)))].join('\n');
  const quoteCsv = [QUOTE_HEADER, ...quotes.map((doc) => rowQuote(doc, jobById.get(doc.jobId)))].join('\n');

  const entries: Record<string, Uint8Array> = {
    'invoices.csv': strToU8(invoiceCsv),
    'quotes.csv': strToU8(quoteCsv),
    'README.txt': strToU8(t('accountantExport.readme')),
  };

  try {
    const customers = await customersRepository.listRecentCustomers(10_000);
    if (customers.length > 0) {
      const header = 'id,name,phone,email,address,postcode';
      const rows = customers.map((c) =>
        [c.id, c.name, c.phone ?? '', c.email ?? '', c.address ?? '', c.postcode ?? '']
          .map((cell) => csvEscape(cell))
          .join(',')
      );
      entries['customers.csv'] = strToU8([header, ...rows].join('\n'));
    }
  } catch {
    // customers table may not exist yet
  }

  for (const doc of documents) {
    if (!doc.localPdfUri) continue;
    const bytes = await readBytes(doc.localPdfUri);
    if (!bytes) continue;
    const folder = doc.kind === 'invoice' ? 'pdfs/invoices' : doc.kind === 'quote' ? 'pdfs/quotes' : 'pdfs/reports';
    const name = doc.fileName ?? `${doc.kind}-${doc.number ?? doc.id}.pdf`;
    entries[`${folder}/${name}`] = bytes;
  }

  return zipSync(entries, { level: 0 });
}

export async function exportForAccountant(): Promise<string> {
  const bytes = await buildAccountantExportZip();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = temporaryFilePath(`tradesreport-accountant-${stamp}.zip`);
  await writeBytes(path, bytes);
  return path;
}

export async function shareAccountantExport(): Promise<boolean> {
  const path = await exportForAccountant();
  if (Platform.OS === 'web') {
    return shareFile(path, t('accountantExport.shareTitle'));
  }
  return shareFile(path, t('accountantExport.shareTitle'), { dialogTitle: t('accountantExport.shareTitle') });
}
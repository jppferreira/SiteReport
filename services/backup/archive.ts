import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

import {
  BusinessProfile,
  Customer,
  Job,
  JobChecklist,
  Photo,
  PhotoArea,
  Report,
  ReportEvent,
  Signature,
  TradeDocument,
  WorkSummary,
  coerceBusinessProfileFields,
  coercePhotoAnnotations,
  isReportTemplateId,
  normalizeChecklistTemplateId,
  normalizeDocumentKind,
  normalizeDocumentStatus,
  normalizeDocumentType,
  normalizeReportEventKind,
  normalizeReportImageMask,
  normalizeReportStatus,
  normalizeReportTemplateId,
  parseChecklistItems,
  parsePricing,
} from '@/models';

import { isSafeRelativePath, zipEntryName } from './paths';
import { t } from '@/i18n';

export const BACKUP_FORMAT = 'tradesreport-backup';
export const BACKUP_FORMAT_VERSION = 1;

export type BackupFile = {
  path: string;
  bytes: number;
  sha256: string;
};

/** Portable copy of the job database. File fields are relative sitereport paths. */
export type BackupManifest = {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  files: BackupFile[];
  jobs: Job[];
  photos: Photo[];
  areas: PhotoArea[];
  summaries: WorkSummary[];
  signatures: Signature[];
  reports: Report[];
  checklists: JobChecklist[];
  events: ReportEvent[];
  businessProfile: BusinessProfile | null;
  documents: TradeDocument[];
  customers: Customer[];
};

export type OpenedBackup = {
  manifest: BackupManifest;
  files: Map<string, Uint8Array>;
};

export type BackupOpenResult = { ok: true; backup: OpenedBackup } | { ok: false; message: string };

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const copy = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest('SHA-256', copy);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function packArchive(manifest: BackupManifest, files: { path: string; data: Uint8Array }[]): Uint8Array {
  const entries: Record<string, Uint8Array> = {
    'manifest.json': strToU8(JSON.stringify(manifest)),
  };
  for (const file of files) {
    if (!isSafeRelativePath(file.path)) {
      throw new Error('Refusing to pack a file outside the backup.');
    }
    entries[zipEntryName(file.path)] = file.data;
  }
  return zipSync(entries, { level: 0 });
}

/**
 * Checks the zip completely. A failure here means the caller must not write
 * or delete anything already stored on the phone.
 */
export async function openBackup(bytes: Uint8Array): Promise<BackupOpenResult> {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    return { ok: false, message: t('backup.fileDamaged') };
  }

  const names = Object.keys(entries);
  if (names.some((name) => !isSafeZipName(name))) {
    return { ok: false, message: t('backup.unsafeFilePath') };
  }

  const manifestBytes = entries['manifest.json'];
  if (!manifestBytes) return { ok: false, message: t('backup.missingManifest') };

  let parsed: unknown;
  try {
    parsed = JSON.parse(strFromU8(manifestBytes));
  } catch {
    return { ok: false, message: t('backup.manifestUnreadable') };
  }

  const manifest = parseManifest(parsed);
  if (!manifest) return { ok: false, message: t('backup.notTradeReportFile') };

  const expected = new Set(manifest.files.map((file) => zipEntryName(file.path)));
  expected.add('manifest.json');
  if (names.length !== expected.size || names.some((name) => !expected.has(name))) {
    return { ok: false, message: t('backup.fileListMismatch') };
  }

  const files = new Map<string, Uint8Array>();
  for (const file of manifest.files) {
    const stored = entries[zipEntryName(file.path)];
    if (!stored || stored.byteLength !== file.bytes) {
      return { ok: false, message: t('backup.missingOrTruncatedFile') };
    }
    const hash = await sha256Hex(stored);
    if (hash !== file.sha256) {
      return { ok: false, message: t('backup.changedNotRestored') };
    }
    files.set(file.path, stored);
  }

  const listed = new Set(manifest.files.map((file) => file.path));
  const referenced = referencedPaths(manifest);
  for (const path of referenced) {
    if (!listed.has(path)) return { ok: false, message: t('backup.missingPhotoSignatureOrReport') };
  }

  return { ok: true, backup: { manifest, files } };
}

export async function restoreIfValid(
  bytes: Uint8Array,
  commit: (backup: OpenedBackup) => Promise<void>
): Promise<{ ok: true } | { ok: false; liveDataChanged: false; message: string }> {
  const opened = await openBackup(bytes);
  if (!opened.ok) return { ok: false, liveDataChanged: false, message: opened.message };
  await commit(opened.backup);
  return { ok: true };
}

function isSafeZipName(name: string): boolean {
  if (name === 'manifest.json') return true;
  if (!name.startsWith('files/')) return false;
  return isSafeRelativePath(name.slice('files/'.length));
}

function referencedPaths(manifest: BackupManifest): string[] {
  const paths: string[] = [];
  for (const photo of manifest.photos) {
    paths.push(photo.localUri, photo.thumbnailUri);
  }
  for (const signature of manifest.signatures) paths.push(signature.localSignatureUri);
  for (const report of manifest.reports) paths.push(report.localPdfUri);
  for (const document of manifest.documents ?? []) {
    if (document.localPdfUri) paths.push(document.localPdfUri);
  }
  const profile = manifest.businessProfile;
  if (profile) {
    for (const uri of [profile.logoUri, profile.coverImageUri, profile.thanksImageUri]) {
      if (uri) paths.push(uri);
    }
  }
  return paths;
}

function parseManifest(value: unknown): BackupManifest | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  // Accept this version and older manifests so app updates can still restore
  // backups that already contain frozen report PDFs. Reject unknown newer formats.
  if (record.format !== BACKUP_FORMAT) return null;
  if (
    typeof record.formatVersion !== 'number' ||
    !Number.isInteger(record.formatVersion) ||
    record.formatVersion < 1 ||
    record.formatVersion > BACKUP_FORMAT_VERSION
  ) {
    return null;
  }
  if (typeof record.exportedAt !== 'string') return null;
  if (!Array.isArray(record.files) || !Array.isArray(record.jobs)) return null;

  const files: BackupFile[] = [];
  const seen = new Set<string>();
  for (const item of record.files) {
    if (!item || typeof item !== 'object') return null;
    const file = item as Record<string, unknown>;
    if (typeof file.path !== 'string' || !isSafeRelativePath(file.path)) return null;
    if (typeof file.bytes !== 'number' || file.bytes < 0 || !Number.isSafeInteger(file.bytes)) return null;
    if (typeof file.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(file.sha256)) return null;
    if (seen.has(file.path)) return null;
    seen.add(file.path);
    files.push({ path: file.path, bytes: file.bytes, sha256: file.sha256 });
  }

  const jobs = parseJobs(record.jobs);
  if (!jobs) return null;
  const jobIds = new Set(jobs.map((job) => job.id));
  const photos = parsePhotos(record.photos, jobIds);
  const areas = parseAreas(record.areas, jobIds);
  const summaries = parseSummaries(record.summaries, jobIds);
  const signatures = parseSignatures(record.signatures, jobIds);
  const reports = parseReports(record.reports, jobIds);
  const checklists = parseChecklists(record.checklists, jobIds);
  const reportIds = new Set((reports ?? []).map((report) => report.id));
  const events = parseEvents(record.events, jobIds, reportIds);
  const businessProfile = parseProfile(record.businessProfile);
  const documents = parseDocuments(record.documents, jobIds);
  const customers = parseCustomers(record.customers);
  if (
    !photos ||
    !areas ||
    !summaries ||
    !signatures ||
    !reports ||
    !checklists ||
    !events ||
    businessProfile === undefined ||
    !documents ||
    !customers
  ) {
    return null;
  }

  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: record.exportedAt,
    files,
    jobs,
    photos,
    areas,
    summaries,
    signatures,
    reports,
    checklists,
    events,
    businessProfile,
    documents,
    customers,
  };
}

function parseJobs(value: unknown): Job[] | null {
  if (!Array.isArray(value)) return null;
  const jobs: Job[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.title !== 'string' || typeof row.jobDate !== 'string') return null;
    if (row.status !== 'draft' && row.status !== 'in_progress' && row.status !== 'complete') return null;
    jobs.push({
      id: row.id,
      title: row.title,
      customerName: textOrNull(row.customerName),
      address: textOrNull(row.address),
      jobDate: row.jobDate,
      referenceNumber: textOrNull(row.referenceNumber),
      description: textOrNull(row.description),
      status: row.status,
      coverPhotoId: textOrNull(row.coverPhotoId),
      isQuick: row.isQuick === true || row.isQuick === 1,
      customerId: textOrNull(row.customerId),
      createdAt: typeof row.createdAt === 'string' ? row.createdAt : row.jobDate,
      updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : row.jobDate,
    });
  }
  return jobs;
}

function parsePhotos(value: unknown, jobIds: Set<string>): Photo[] | null {
  if (!Array.isArray(value)) return null;
  const photos: Photo[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.jobId !== 'string' || !jobIds.has(row.jobId)) return null;
    if (row.type !== 'before' && row.type !== 'during' && row.type !== 'after') return null;
    if (typeof row.localUri !== 'string' || !isSafeRelativePath(row.localUri)) return null;
    if (typeof row.thumbnailUri !== 'string' || !isSafeRelativePath(row.thumbnailUri)) return null;
    photos.push({
      id: row.id,
      jobId: row.jobId,
      areaId: textOrNull(row.areaId),
      localUri: row.localUri,
      thumbnailUri: row.thumbnailUri,
      type: row.type,
      caption: textOrNull(row.caption),
      sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : 0,
      width: typeof row.width === 'number' ? row.width : 0,
      height: typeof row.height === 'number' ? row.height : 0,
      takenAt: textOrNull(row.takenAt),
      annotations: coercePhotoAnnotations(row.annotations),
      createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    });
  }
  return photos;
}

function parseAreas(value: unknown, jobIds: Set<string>): PhotoArea[] | null {
  if (!Array.isArray(value)) return null;
  const areas: PhotoArea[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.jobId !== 'string' || !jobIds.has(row.jobId)) return null;
    if (typeof row.name !== 'string') return null;
    areas.push({
      id: row.id,
      jobId: row.jobId,
      name: row.name,
      sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : 0,
      createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    });
  }
  return areas;
}

function parseSummaries(value: unknown, jobIds: Set<string>): WorkSummary[] | null {
  if (!Array.isArray(value)) return null;
  const summaries: WorkSummary[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.jobId !== 'string' || !jobIds.has(row.jobId)) return null;
    summaries.push({
      jobId: row.jobId,
      workCompleted: textOrNull(row.workCompleted),
      materials: textOrNull(row.materials),
      recommendations: textOrNull(row.recommendations),
      notes: textOrNull(row.notes),
      pricing: parsePricing(row.pricing),
      documentType: normalizeDocumentType(row.documentType),
      invoiceNumber: textOrNull(row.invoiceNumber),
      updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : '',
    });
  }
  return summaries;
}

function parseSignatures(value: unknown, jobIds: Set<string>): Signature[] | null {
  if (!Array.isArray(value)) return null;
  const signatures: Signature[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.jobId !== 'string' || !jobIds.has(row.jobId)) return null;
    if (typeof row.localSignatureUri !== 'string' || !isSafeRelativePath(row.localSignatureUri)) return null;
    signatures.push({
      jobId: row.jobId,
      customerName: textOrNull(row.customerName),
      localSignatureUri: row.localSignatureUri,
      width: typeof row.width === 'number' ? row.width : 0,
      height: typeof row.height === 'number' ? row.height : 0,
      signedAt: typeof row.signedAt === 'string' ? row.signedAt : '',
    });
  }
  return signatures;
}

function parseReports(value: unknown, jobIds: Set<string>): Report[] | null {
  if (!Array.isArray(value)) return null;
  const reports: Report[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.jobId !== 'string' || !jobIds.has(row.jobId)) return null;
    if (typeof row.localPdfUri !== 'string' || !isSafeRelativePath(row.localPdfUri)) return null;
    if (typeof row.fileName !== 'string' || typeof row.sourceHash !== 'string') return null;
    const templateId = isReportTemplateId(row.templateId) ? row.templateId : normalizeReportTemplateId(row.templateId);
    reports.push({
      id: row.id,
      jobId: row.jobId,
      localPdfUri: row.localPdfUri,
      fileName: row.fileName,
      generatedAt: typeof row.generatedAt === 'string' ? row.generatedAt : '',
      fileSize: typeof row.fileSize === 'number' ? row.fileSize : 0,
      version: typeof row.version === 'number' ? row.version : 1,
      sourceHash: row.sourceHash,
      templateId,
      status: normalizeReportStatus(row.status),
    });
  }
  return reports;
}

/** Older backups omit checklists; treat missing as empty. */
function parseChecklists(value: unknown, jobIds: Set<string>): JobChecklist[] | null {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  const checklists: JobChecklist[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.jobId !== 'string' || !jobIds.has(row.jobId)) return null;
    if (typeof row.itemsJson !== 'string' && !Array.isArray(row.items)) return null;
    const items =
      typeof row.itemsJson === 'string'
        ? parseChecklistItems(row.itemsJson)
        : parseChecklistItems(JSON.stringify(row.items));
    checklists.push({
      jobId: row.jobId,
      templateId: normalizeChecklistTemplateId(row.templateId),
      includeInPdf: Boolean(row.includeInPdf),
      items,
      updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : '',
    });
  }
  return checklists;
}

/** Older backups omit events; treat missing as empty. */
function parseEvents(value: unknown, jobIds: Set<string>, reportIds: Set<string>): ReportEvent[] | null {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  const events: ReportEvent[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.reportId !== 'string' || typeof row.jobId !== 'string') return null;
    if (!jobIds.has(row.jobId)) return null;
    if (reportIds.size > 0 && !reportIds.has(row.reportId)) return null;
    if (typeof row.label !== 'string') return null;
    events.push({
      id: row.id,
      reportId: row.reportId,
      jobId: row.jobId,
      kind: normalizeReportEventKind(row.kind),
      label: row.label,
      recipient: textOrNull(row.recipient),
      createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    });
  }
  return events;
}

function parseProfile(value: unknown): BusinessProfile | null | undefined {
  if (value == null) return null;
  if (typeof value !== 'object') return undefined;
  const row = value as Record<string, unknown>;
  const logoUri = optionalPath(row.logoUri);
  const coverImageUri = optionalPath(row.coverImageUri);
  const thanksImageUri = optionalPath(row.thanksImageUri);
  if (logoUri === undefined || coverImageUri === undefined || thanksImageUri === undefined) return undefined;
  return {
    businessName: textOrNull(row.businessName),
    logoUri,
    coverImageUri,
    thanksImageUri,
    imageMask: normalizeReportImageMask(row.imageMask),
    ownerName: textOrNull(row.ownerName),
    email: textOrNull(row.email),
    phone: textOrNull(row.phone),
    website: textOrNull(row.website),
    address: textOrNull(row.address),
    registrationNumber: textOrNull(row.registrationNumber),
    vatNumber: textOrNull(row.vatNumber),
    accentColor: textOrNull(row.accentColor),
    footerMessage: textOrNull(row.footerMessage),
    ...coerceBusinessProfileFields(row),
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : '',
  };
}

function optionalPath(value: unknown): string | null | undefined {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !isSafeRelativePath(value)) return undefined;
  return value;
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Older backups omit documents; treat missing as empty. */
function parseDocuments(value: unknown, jobIds: Set<string>): TradeDocument[] | null {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  const documents: TradeDocument[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.jobId !== 'string' || !jobIds.has(row.jobId)) return null;
    const kind = normalizeDocumentKind(row.kind);
    if (typeof row.createdAt !== 'string' || typeof row.updatedAt !== 'string') return null;
    const localPdfUri = optionalPath(row.localPdfUri) ?? null;
    if (row.localPdfUri != null && row.localPdfUri !== '' && localPdfUri === undefined) return null;
    documents.push({
      id: row.id,
      jobId: row.jobId,
      kind,
      number: textOrNull(row.number),
      status: normalizeDocumentStatus(kind, row.status),
      title: textOrNull(row.title),
      totalPence: row.totalPence == null ? null : Number(row.totalPence),
      netPence: row.netPence == null ? null : Number(row.netPence),
      vatPence: row.vatPence == null ? null : Number(row.vatPence),
      dueDate: textOrNull(row.dueDate),
      validUntil: textOrNull(row.validUntil),
      sentAt: textOrNull(row.sentAt),
      paidAt: textOrNull(row.paidAt),
      acceptedAt: textOrNull(row.acceptedAt),
      declinedAt: textOrNull(row.declinedAt),
      paidMethod: textOrNull(row.paidMethod),
      paidAmountPence: row.paidAmountPence == null ? null : Number(row.paidAmountPence),
      sourceDocumentId: textOrNull(row.sourceDocumentId),
      attachedReportId: textOrNull(row.attachedReportId),
      pricingSnapshotJson: typeof row.pricingSnapshotJson === 'string' ? row.pricingSnapshotJson : null,
      reportId: textOrNull(row.reportId),
      localPdfUri,
      fileName: textOrNull(row.fileName),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
  return documents;
}

/** Older backups omit customers; treat missing as empty. */
function parseCustomers(value: unknown): Customer[] | null {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  const customers: Customer[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.name !== 'string') return null;
    if (typeof row.createdAt !== 'string' || typeof row.updatedAt !== 'string') return null;
    customers.push({
      id: row.id,
      name: row.name,
      phone: textOrNull(row.phone),
      email: textOrNull(row.email),
      address: textOrNull(row.address),
      postcode: textOrNull(row.postcode),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
  return customers;
}

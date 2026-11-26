import { Directory, File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import {
  businessProfileRepository,
  customersRepository,
  documentsRepository,
  jobChecklistsRepository,
  jobsRepository,
  photoAreasRepository,
  photosRepository,
  reportEventsRepository,
  reportsRepository,
  signatureRepository,
  workSummaryRepository,
} from '@/database';
import { flushWebDatabase } from '@/database/client';
import { replaceAppData } from '@/database/replaceAppData';
import { BusinessProfile } from '@/models';
import { deleteFileSafely, readBytes, temporaryFilePath, writeBytes } from '@/services/fileService';
import { shareFile } from '@/services/shareService';
import { logger } from '@/utils/logger';

import { BackupManifest, packArchive, restoreIfValid, sha256Hex } from './archive';
import { decryptBackupZip, encryptBackupZip, isEncryptedBackup } from './backupCrypto';
import { assertGoogleDriveReady, saveZipToGoogleDrive } from './googleDrive';
import { assertIcloudReady, saveZipToIcloudDrive } from './icloudDrive';
import { orphanBackupPath, toBackupPath } from './paths';
import { backupTransport, fileNameFromPath, userFacingBackupError } from './saveTarget';
import { t } from '@/i18n';

export { userFacingBackupError };

export type BackupDestination = 'icloud' | 'google-drive' | 'manual';

export type SaveBackupOptions = { password?: string };

export type RestoreOutcome =
  | { ok: true }
  | { ok: false; cancelled: true }
  | { ok: false; liveDataChanged: false; message: string };

export type RestorePickResult =
  | { kind: 'cancelled' }
  | { kind: 'ready'; bytes: Uint8Array; encrypted: boolean };

function liveRoot(): string {
  return Platform.OS === 'web' ? 'sitereport/' : `${FileSystem.documentDirectory}sitereport/`;
}

function incomingRoot(): string {
  return Platform.OS === 'web' ? 'sitereport-incoming/' : `${FileSystem.documentDirectory}sitereport-incoming/`;
}

export function backupFileName(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `tradesreport-backup-${stamp}.zip`;
}

/** Builds a zip of jobs, photos, signatures, and PDFs. Nothing is deleted. */
export async function createBackupFile(options?: SaveBackupOptions): Promise<string> {
  let bytes = await buildBackup();
  if (options?.password) {
    bytes = await encryptBackupZip(bytes, options.password);
  }
  const path = temporaryFilePath(backupFileName());
  await writeBytes(path, bytes);
  return path;
}

/**
 * iPhone "Save to iCloud Drive" copies the zip into this app's iCloud Drive folder.
 * Android "Save to Google Drive" opens Google Drive's save screen.
 * "Save a copy" still uses the system folder picker. This app does not sign in to either.
 */
export async function saveBackup(
  destination: BackupDestination,
  options?: SaveBackupOptions
): Promise<'saved' | 'cancelled'> {
  const transport = backupTransport(Platform.OS, destination);
  if (transport === 'icloud') assertIcloudReady();
  if (transport === 'google-drive') assertGoogleDriveReady();

  const path = await createBackupFile(options);
  const fileName = fileNameFromPath(path, backupFileName());
  try {
    if (transport === 'web') {
      const shared = await shareFile(path, fileName);
      if (!shared) throw new Error(t('backup.sharingUnavailable'));
      return 'saved';
    }
    if (transport === 'icloud') {
      await saveZipToIcloudDrive(path, fileName);
      logger.info('Backup saved', { destination, fileName });
      return 'saved';
    }
    if (transport === 'google-drive') {
      const saved = await saveZipToGoogleDrive(path, fileName);
      if (saved === 'saved') logger.info('Backup saved', { destination, fileName });
      return saved;
    }
    const directory = await Directory.pickDirectoryAsync();
    const destinationFile = directory.createFile(fileName, 'application/zip');
    const bytes = await readBytes(path);
    if (!bytes) throw new Error(t('backup.couldNotReadFile'));
    destinationFile.write(bytes);
    logger.info('Backup saved', { destination, fileName });
    return 'saved';
  } catch (error) {
    if (isCancel(error)) return 'cancelled';
    throw error;
  } finally {
    await deleteFileSafely(path);
  }
}

export async function pickBackupFile(): Promise<RestorePickResult> {
  try {
    // Drive often stores uploaded zips as application/octet-stream (or other
    // vendor types). A narrow zip-only filter shows “No matches in Drive”.
    const picked = await File.pickFileAsync({
      mimeTypes: [
        'application/zip',
        'application/x-zip',
        'application/x-zip-compressed',
        'application/octet-stream',
        'application/*',
        '*/*',
      ],
    });
    if (picked.canceled || !picked.result) return { kind: 'cancelled' };
    const bytes = await picked.result.bytes();
    return { kind: 'ready', bytes, encrypted: isEncryptedBackup(bytes) };
  } catch (error) {
    if (isCancel(error)) return { kind: 'cancelled' };
    throw error;
  }
}

export async function restoreBackupFromPicker(password?: string): Promise<RestoreOutcome> {
  try {
    const picked = await pickBackupFile();
    if (picked.kind === 'cancelled') return { ok: false, cancelled: true };
    if (picked.encrypted && !password) {
      return { ok: false, liveDataChanged: false, message: t('backup.passwordRequired') };
    }
    return restoreBackupBytes(picked.bytes, password);
  } catch (error) {
    if (isCancel(error)) return { ok: false, cancelled: true };
    return {
      ok: false,
      liveDataChanged: false,
      message: t('backup.couldNotOpen'),
    };
  }
}

export async function restoreBackupBytes(bytes: Uint8Array, password?: string): Promise<RestoreOutcome> {
  let zipBytes = bytes;
  if (isEncryptedBackup(bytes)) {
    if (!password) {
      return { ok: false, liveDataChanged: false, message: t('backup.passwordRequired') };
    }
    try {
      zipBytes = await decryptBackupZip(bytes, password);
    } catch {
      return { ok: false, liveDataChanged: false, message: t('backup.wrongPassword') };
    }
  }

  let committed = false;
  try {
    const opened = await restoreIfValid(zipBytes, async (backup) => {
      await deleteFileSafely(incomingRoot());
      for (const [relative, data] of backup.files) {
        const destination = `${incomingRoot()}${relative}`;
        await writeBytes(destination, data);
        const written = await readBytes(destination);
        if (!written || written.byteLength !== data.byteLength) {
          throw new Error(t('backup.restoredFileUnreadable'));
        }
      }
      await replaceAppData(backup.manifest, incomingRoot());
      committed = true;
    });
    if (!opened.ok) return opened;
    await deleteFileSafely(liveRoot());
    await flushWebDatabase();
    return { ok: true };
  } catch (error) {
    logger.warn('Restore failed', { error: String(error) });
    if (!committed) {
      await deleteFileSafely(incomingRoot());
      return {
        ok: false,
        liveDataChanged: false,
        message: t('backup.couldNotRestore'),
      };
    }
    await flushWebDatabase();
    return { ok: true };
  }
}

async function buildBackup(): Promise<Uint8Array> {
  const jobs = await jobsRepository.listJobs('all');
  const photos = [];
  const areas = [];
  const summaries = [];
  const signatures = [];
  const reports = [];
  const checklists = [];
  const uriByPath = new Map<string, string>();
  const jobIds = new Set(jobs.map((job) => job.id));

  const claim = (uri: string | null | undefined): string | null => {
    if (!uri) return null;
    // Expo Go often percent-encodes sitereport/. Older print files can sit in
    // the host cache. Prefer the real sitereport path; otherwise recover.
    const relative = toBackupPath(uri) ?? orphanBackupPath(uri);
    if (!relative) throw new Error(t('backup.jobFileOutsideAppFolder'));
    const existing = uriByPath.get(relative);
    if (existing && existing !== uri) {
      const unique = orphanBackupPath(`${uri}#${uriByPath.size}`);
      if (!unique) throw new Error(t('backup.jobFileOutsideAppFolder'));
      uriByPath.set(unique, uri);
      return unique;
    }
    uriByPath.set(relative, uri);
    return relative;
  };

  for (const job of jobs) {
    const [jobPhotos, jobAreas, summary, signature, jobReports, checklist] = await Promise.all([
      photosRepository.listPhotos(job.id),
      photoAreasRepository.listAreas(job.id),
      workSummaryRepository.getWorkSummary(job.id),
      signatureRepository.getSignature(job.id),
      reportsRepository.listReportsForJob(job.id),
      jobChecklistsRepository.getChecklist(job.id),
    ]);
    for (const photo of jobPhotos) {
      const localUri = claim(photo.localUri);
      const thumbnailUri = claim(photo.thumbnailUri);
      if (!localUri || !thumbnailUri) throw new Error(t('backup.photoCouldNotBeAdded'));
      photos.push({ ...photo, localUri, thumbnailUri });
    }
    areas.push(...jobAreas);
    if (summary) summaries.push(summary);
    if (signature) {
      const localSignatureUri = claim(signature.localSignatureUri);
      if (!localSignatureUri) throw new Error(t('backup.signatureCouldNotBeAdded'));
      signatures.push({ ...signature, localSignatureUri });
    }
    for (const report of jobReports) {
      const localPdfUri = claim(report.localPdfUri);
      if (!localPdfUri) throw new Error(t('backup.reportCouldNotBeAdded'));
      reports.push({ ...report, localPdfUri });
    }
    if (checklist) checklists.push(checklist);
  }

  const reportIds = new Set(reports.map((report) => report.id));
  const events = (await reportEventsRepository.listAllEvents()).filter(
    (event) => jobIds.has(event.jobId) && reportIds.has(event.reportId)
  );

  const business = relativizeProfile(await businessProfileRepository.getBusinessProfile(), claim);
  const tradeDocuments = [];
  for (const doc of await documentsRepository.listAllDocuments()) {
    // Skip rows left behind after a job was removed — packing them makes restore
    // reject the whole zip as an invalid Trade Report backup.
    if (!jobIds.has(doc.jobId)) continue;
    let localPdfUri = doc.localPdfUri;
    if (localPdfUri) {
      localPdfUri = claim(localPdfUri);
      if (!localPdfUri) throw new Error(t('backup.reportCouldNotBeAdded'));
    }
    tradeDocuments.push({ ...doc, localPdfUri });
  }

  let customers: Awaited<ReturnType<typeof customersRepository.listRecentCustomers>> = [];
  try {
    customers = await customersRepository.listRecentCustomers(50_000);
  } catch {
    customers = [];
  }

  const files: { path: string; data: Uint8Array }[] = [];
  for (const [relative, uri] of uriByPath) {
    const data = await readBytes(uri);
    if (!data) throw new Error(t('backup.assetCouldNotBeRead'));
    files.push({ path: relative, data });
  }

  const listed = await Promise.all(
    files.map(async (file) => ({ path: file.path, bytes: file.data.byteLength, sha256: await sha256Hex(file.data) }))
  );

  const manifest: BackupManifest = {
    format: 'tradesreport-backup',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    files: listed,
    jobs,
    photos,
    areas,
    summaries,
    signatures,
    reports,
    checklists,
    events,
    businessProfile: business,
    documents: tradeDocuments,
    customers,
  };
  return packArchive(manifest, files);
}

function relativizeProfile(profile: BusinessProfile, claim: (uri: string | null | undefined) => string | null): BusinessProfile {
  return {
    ...profile,
    logoUri: claim(profile.logoUri),
    coverImageUri: claim(profile.coverImageUri),
    thanksImageUri: claim(profile.thanksImageUri),
  };
}

function isCancel(error: unknown): boolean {
  const text = String(error).toLowerCase();
  return text.includes('cancel') || text.includes('dismiss');
}

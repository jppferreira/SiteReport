import { Directory, File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import {
  businessProfileRepository,
  jobsRepository,
  photoAreasRepository,
  photosRepository,
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
import { toBackupPath } from './paths';
import { t } from '@/i18n';

export type BackupDestination = 'icloud' | 'google-drive' | 'manual';

export type RestoreOutcome =
  | { ok: true }
  | { ok: false; cancelled: true }
  | { ok: false; liveDataChanged: false; message: string };

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
export async function createBackupFile(): Promise<string> {
  const bytes = await buildBackup();
  const path = temporaryFilePath(backupFileName());
  await writeBytes(path, bytes);
  return path;
}

/**
 * Saves the zip through the system file picker. iCloud Drive and Google Drive
 * are locations in that picker. This app does not sign in to either.
 */
export async function saveBackup(destination: BackupDestination): Promise<'saved' | 'cancelled'> {
  const path = await createBackupFile();
  try {
    if (Platform.OS === 'web') {
      const shared = await shareFile(path, backupFileName());
      if (!shared) throw new Error(t('backup.sharingUnavailable'));
      return 'saved';
    }
    const directory = await Directory.pickDirectoryAsync();
    const destinationFile = directory.createFile(backupFileName(), 'application/zip');
    const bytes = await readBytes(path);
    if (!bytes) throw new Error(t('backup.couldNotReadFile'));
    destinationFile.write(bytes);
    logger.debug('Backup saved', { destination });
    return 'saved';
  } catch (error) {
    if (isCancel(error)) return 'cancelled';
    throw error;
  } finally {
    await deleteFileSafely(path);
  }
}

export async function restoreBackupFromPicker(): Promise<RestoreOutcome> {
  try {
    const picked = await File.pickFileAsync({ mimeTypes: ['application/zip', 'application/octet-stream'] });
    if (picked.canceled || !picked.result) return { ok: false, cancelled: true };
    const bytes = await picked.result.bytes();
    return restoreBackupBytes(bytes);
  } catch (error) {
    if (isCancel(error)) return { ok: false, cancelled: true };
    return {
      ok: false,
      liveDataChanged: false,
      message: t('backup.couldNotOpen'),
    };
  }
}

export async function restoreBackupBytes(bytes: Uint8Array): Promise<RestoreOutcome> {
  let committed = false;
  try {
    const opened = await restoreIfValid(bytes, async (backup) => {
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
  const uriByPath = new Map<string, string>();

  const claim = (uri: string | null | undefined): string | null => {
    if (!uri) return null;
    const relative = toBackupPath(uri);
    if (!relative) throw new Error(t('backup.jobFileOutsideAppFolder'));
    uriByPath.set(relative, uri);
    return relative;
  };

  for (const job of jobs) {
    const [jobPhotos, jobAreas, summary, signature, jobReports] = await Promise.all([
      photosRepository.listPhotos(job.id),
      photoAreasRepository.listAreas(job.id),
      workSummaryRepository.getWorkSummary(job.id),
      signatureRepository.getSignature(job.id),
      reportsRepository.listReportsForJob(job.id),
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
  }

  const business = relativizeProfile(await businessProfileRepository.getBusinessProfile(), claim);
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
    businessProfile: business,
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

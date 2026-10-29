import { Platform } from 'react-native';

import { deleteFileSafely } from '@/services/fileService';
import { AppPreferences, getPreferences, savePreferences } from '@/services/preferencesService';
import { logger } from '@/utils/logger';

import { icloudDriveAvailable, IcloudAvailability, saveZipToIcloudDrive } from './icloudDrive';

export const ICLOUD_BACKUP_FILE_NAME = 'tradesreport-icloud-backup.zip';
export const ICLOUD_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type IcloudBackupReason = 'schedule' | 'report';
export type IcloudBackupResult = 'saved' | 'skipped' | 'unavailable' | 'failed';

export function shouldRunIcloudBackup(input: {
  enabled: boolean;
  platform: string;
  reason: IcloudBackupReason;
  now: number;
  lastBackupAt: number | null;
}): boolean {
  if (!input.enabled || input.platform !== 'ios') return false;
  if (input.reason === 'report') return true;
  if (input.lastBackupAt == null) return true;
  return input.now - input.lastBackupAt >= ICLOUD_BACKUP_INTERVAL_MS;
}

export function shouldShowIcloudTip(input: { seen: boolean; platform: string }): boolean {
  return input.platform === 'ios' && !input.seen;
}

export type IcloudBackupDeps = {
  getPreferences: () => Promise<Pick<AppPreferences, 'icloudAutoBackup' | 'lastIcloudBackupAt'>>;
  savePreferences: (patch: Partial<AppPreferences>) => Promise<unknown>;
  platform: string;
  now: () => number;
  availability: () => IcloudAvailability;
  createBackupFile: () => Promise<string>;
  saveZip: (path: string, fileName: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
};

let inFlight: Promise<IcloudBackupResult> | null = null;

export async function runIcloudAutoBackup(
  reason: IcloudBackupReason,
  deps: IcloudBackupDeps = defaultIcloudBackupDeps()
): Promise<IcloudBackupResult> {
  if (inFlight) return inFlight;
  const run = runOnce(reason, deps).finally(() => {
    inFlight = null;
  });
  inFlight = run;
  return run;
}

async function runOnce(reason: IcloudBackupReason, deps: IcloudBackupDeps): Promise<IcloudBackupResult> {
  try {
    const preferences = await deps.getPreferences();
    const lastBackupAt = parseTime(preferences.lastIcloudBackupAt);
    const due = shouldRunIcloudBackup({
      enabled: preferences.icloudAutoBackup,
      platform: deps.platform,
      reason,
      now: deps.now(),
      lastBackupAt,
    });
    if (!due) return 'skipped';
    if (deps.availability() !== 'ready') return 'unavailable';

    const path = await deps.createBackupFile();
    try {
      await deps.saveZip(path, ICLOUD_BACKUP_FILE_NAME);
    } finally {
      await deps.deleteFile(path);
    }
    await deps.savePreferences({ lastIcloudBackupAt: new Date(deps.now()).toISOString() });
    return 'saved';
  } catch (error) {
    logger.warn('iCloud auto-backup failed', { error: String(error) });
    return 'failed';
  }
}

function parseTime(value: string | null): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function defaultIcloudBackupDeps(): IcloudBackupDeps {
  return {
    getPreferences,
    savePreferences,
    platform: Platform.OS,
    now: () => Date.now(),
    availability: icloudDriveAvailable,
    createBackupFile: async () => {
      const { createBackupFile } = await import('./backupService');
      return createBackupFile();
    },
    saveZip: saveZipToIcloudDrive,
    deleteFile: deleteFileSafely,
  };
}

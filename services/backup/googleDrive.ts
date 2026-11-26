import * as FileSystem from 'expo-file-system/legacy';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

import { t } from '@/i18n';
import { shareFile } from '@/services/shareService';

import { classifyDriveError } from './saveTarget';

export type GoogleDriveAvailability = 'ready' | 'missing-app' | 'share' | 'missing';

type GoogleDriveNative = {
  availability: () => string;
  saveZip: (sourcePath: string, fileName: string) => Promise<string>;
};

function nativeModule(): GoogleDriveNative | null {
  if (Platform.OS !== 'android') return null;
  return requireOptionalNativeModule<GoogleDriveNative>('GoogleDriveSave');
}

/**
 * Native Drive save is ready in a development / store build with the Drive app.
 * Expo Go has no custom native module, so it falls back to the share sheet.
 */
export function googleDriveAvailable(): GoogleDriveAvailability {
  const native = nativeModule();
  if (!native) return Platform.OS === 'android' ? 'share' : 'missing';
  return native.availability() === 'ready' ? 'ready' : 'missing-app';
}

export function assertGoogleDriveReady(): void {
  const availability = googleDriveAvailable();
  if (availability === 'missing') throw new Error(t('backup.googleDriveNeedsAndroidApp'));
  if (availability === 'missing-app') throw new Error(t('backup.googleDriveAppMissing'));
}

/**
 * Opens Google Drive's save screen when the native module is present.
 * In Expo Go, opens the share sheet so you can pick Google Drive there.
 */
export async function saveZipToGoogleDrive(sourcePath: string, fileName: string): Promise<'saved' | 'cancelled'> {
  assertGoogleDriveReady();
  const native = nativeModule();
  if (!native) {
    const shared = await shareFile(sourcePath, fileName, { dialogTitle: t('data.saveToGoogleDrive') });
    if (!shared) throw new Error(t('backup.sharingUnavailable'));
    return 'saved';
  }
  try {
    // Expo's File.write can return before the inode is visible to java.io.File.
    // Native saveZip rejects empty/missing sources with ERR_DRIVE_WRITE before the
    // DocumentsUI picker opens — wait until the zip has a non-zero size.
    await waitForReadableZip(sourcePath);
    console.warn('[Trade Report] Google Drive saveZip', { sourcePath, fileName });
    const result = await native.saveZip(sourcePath, fileName);
    if (result === 'cancelled') return 'cancelled';
    if (result === 'saved') return 'saved';
    throw new Error(t('backup.googleDriveWriteFailed'));
  } catch (error) {
    console.warn('[Trade Report] Google Drive save failed (raw)', {
      message: error instanceof Error ? error.message : String(error),
      code: error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : undefined,
      name: error instanceof Error ? error.name : typeof error,
    });
    if (error instanceof Error && isTranslatedDriveError(error)) throw error;
    const kind = classifyDriveError(error);
    if (kind === 'cancelled') return 'cancelled';
    if (kind === 'missing-app') throw new Error(t('backup.googleDriveAppMissing'));
    if (kind === 'not-selected') throw new Error(t('backup.googleDriveNotSelected'));
    throw new Error(t('backup.googleDriveWriteFailed'));
  }
}

function isTranslatedDriveError(error: Error): boolean {
  return (
    error.message === t('backup.googleDriveNeedsAndroidApp') ||
    error.message === t('backup.googleDriveAppMissing') ||
    error.message === t('backup.googleDriveNotSelected') ||
    error.message === t('backup.googleDriveWriteFailed') ||
    error.message === t('backup.sharingUnavailable')
  );
}

/**
 * Native GoogleDriveSave uses java.io.File. Expo's File.write can return before
 * that view of the cache file has a non-zero length, which makes saveZip throw
 * ERR_DRIVE_WRITE before DocumentsUI opens.
 */
async function waitForReadableZip(sourcePath: string): Promise<void> {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    try {
      const info = await FileSystem.getInfoAsync(sourcePath);
      if (info.exists && 'size' in info && typeof info.size === 'number' && info.size > 0) {
        // One extra tick so java.io.File sees the same bytes.
        await new Promise((resolve) => setTimeout(resolve, 100));
        return;
      }
    } catch {
      // Retry until the cache file is visible.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

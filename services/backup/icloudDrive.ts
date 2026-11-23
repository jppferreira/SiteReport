import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import { t } from '@/i18n';

export type IcloudAvailability = 'ready' | 'signed-out' | 'missing';

type IcloudBackupNative = {
  availability: () => string;
  saveZip: (sourcePath: string, fileName: string) => Promise<string> | string;
};

function nativeModule(): IcloudBackupNative | null {
  if (Platform.OS !== 'ios') return null;
  return requireOptionalNativeModule<IcloudBackupNative>('IcloudBackup');
}

/** True only in an iOS build that includes the iCloud Documents module. Expo Go does not. */
export function icloudDriveAvailable(): IcloudAvailability {
  const native = nativeModule();
  if (!native) return 'missing';
  return native.availability() === 'ready' ? 'ready' : 'signed-out';
}

export function assertIcloudReady(): void {
  const availability = icloudDriveAvailable();
  if (availability === 'missing') throw new Error(t('backup.icloudNeedsIosApp'));
  if (availability === 'signed-out') throw new Error(t('backup.icloudSignedOut'));
}

/** Copies the zip into this app's iCloud Drive folder. Uses the Apple ID already on the iPhone. */
export async function saveZipToIcloudDrive(sourcePath: string, fileName: string): Promise<void> {
  assertIcloudReady();
  const native = nativeModule();
  if (!native) throw new Error(t('backup.icloudNeedsIosApp'));
  try {
    await native.saveZip(sourcePath, fileName);
  } catch (error) {
    const text = String(error).toLowerCase();
    if (text.includes('signed')) throw new Error(t('backup.icloudSignedOut'));
    if (text.includes('not available') || text.includes('container')) throw new Error(t('backup.icloudNotReady'));
    throw new Error(t('backup.icloudWriteFailed'));
  }
}

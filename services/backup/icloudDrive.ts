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

export async function saveZipToIcloudDrive(sourcePath: string, fileName: string): Promise<void> {
  const native = nativeModule();
  if (!native) {
    throw new Error(t('backup.icloudNeedsIosApp'));
  }
  await native.saveZip(sourcePath, fileName);
}

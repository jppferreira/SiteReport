import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export type SaveResult = 'saved' | 'cancelled' | 'unsupported' | 'error';

/**
 * "Save a copy" has no single cross-platform API outside the share sheet.
 * On Android we use the Storage Access Framework so the user can pick a
 * real destination folder (e.g. Downloads). On iOS, saving to Files is only
 * reachable through the share sheet, so we delegate to `shareFile` there.
 */
export async function saveFileCopy(uri: string, fileName: string): Promise<SaveResult> {
  if (Platform.OS === 'android') {
    try {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) return 'cancelled';

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const destinationUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileName,
        'application/pdf'
      );
      await FileSystem.writeAsStringAsync(destinationUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      return 'saved';
    } catch {
      return 'error';
    }
  }

  // iOS: Files app saving is only reachable through the share sheet.
  const shared = await shareFile(uri, 'Save report');
  return shared ? 'saved' : 'unsupported';
}

export async function shareFile(uri: string, dialogTitle?: string): Promise<boolean> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    return false;
  }
  await Sharing.shareAsync(uri, {
    dialogTitle,
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });
  return true;
}

export async function isSharingAvailable(): Promise<boolean> {
  return Sharing.isAvailableAsync();
}

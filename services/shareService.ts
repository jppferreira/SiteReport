import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { logger } from '@/utils/logger';

import { copyFile, displayUri, readAsBase64, temporaryFilePath } from './fileService';
import { t } from '@/i18n';

export type SaveResult = 'saved' | 'cancelled' | 'unsupported' | 'error';

/**
 * "Save a copy" has no single cross-platform API outside the share sheet.
 * On Android we use the Storage Access Framework so the user can pick a
 * real destination folder (e.g. Downloads). On iOS, saving to Files is only
 * reachable through the share sheet, so we delegate to `shareFile` there.
 */
function downloadName(uri: string, label?: string): string {
  if (label && label.includes('.')) return label;
  return uri.split('/').pop() || 'sitereport-file';
}

function isFileName(label?: string): label is string {
  return Boolean(label && /\.[a-z0-9]{1,8}$/i.test(label) && !label.includes('/') && !label.includes('\\'));
}

/**
 * Share sheets name the attachment from the file path. Stage a cache copy so
 * Expo Go on Android can open the file and the PDF keeps the chosen name.
 */
async function materializeShareableUri(uri: string, fileName: string): Promise<string> {
  const destination = temporaryFilePath(fileName);
  await copyFile(uri, destination);
  return destination;
}

/** Saves or downloads a local file. On web this never leaves the device. */
async function downloadLocalFile(uri: string, fileName?: string): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const href = await displayUri(uri);
  if (!href) return false;
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = downloadName(uri, fileName);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return true;
}

/** Opens a report that already lives on this device. */
export async function openLocalFile(uri: string): Promise<void> {
  if (Platform.OS === 'web') {
    const href = await displayUri(uri);
    if (!href || typeof window === 'undefined') {
      throw new Error(t('share.fileUnavailable'));
    }
    const opened = window.open(href, '_blank', 'noopener,noreferrer');
    if (!opened) {
      const downloaded = await downloadLocalFile(uri);
      if (!downloaded) throw new Error(t('share.fileUnavailable'));
    }
    return;
  }
  await Print.printAsync({ uri });
}

export async function saveFileCopy(uri: string, fileName: string): Promise<SaveResult> {
  if (Platform.OS === 'web') {
    const saved = await downloadLocalFile(uri, fileName);
    return saved ? 'saved' : 'unsupported';
  }

  if (Platform.OS === 'android') {
    try {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) return 'cancelled';

      const base64 = await readAsBase64(uri);
      if (!base64) return 'error';
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
  const shared = await shareFile(uri, fileName);
  return shared ? 'saved' : 'unsupported';
}

export async function shareFile(uri: string, fileName?: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return downloadLocalFile(uri, fileName);
  }
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    return false;
  }
  try {
    const name = isFileName(fileName) ? fileName : downloadName(uri, fileName);
    const shareUri = await materializeShareableUri(uri, name);
    await Sharing.shareAsync(shareUri, {
      dialogTitle: fileName,
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
    });
    return true;
  } catch (error) {
    logger.warn('Share failed', { error: String(error) });
    return false;
  }
}

export async function isSharingAvailable(): Promise<boolean> {
  return Sharing.isAvailableAsync();
}

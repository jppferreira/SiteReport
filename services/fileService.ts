import { fetch as expoFetch } from 'expo/fetch';
import { Directory, File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { logger } from '@/utils/logger';

import { base64ToBytes, bytesToBase64, fileUriReadCandidates } from './fileUri';
import { getWebFileStore } from './webFileStore';
import { t } from '@/i18n';

const ROOT = Platform.OS === 'web' ? 'sitereport/' : `${FileSystem.documentDirectory}sitereport/`;
const JOBS_DIR = `${ROOT}jobs/`;
const BUSINESS_DIR = `${ROOT}business/`;

type FileInfo = { exists: boolean; isDirectory: boolean; size: number };

function isWeb(): boolean {
  return Platform.OS === 'web';
}

async function getInfo(path: string): Promise<FileInfo> {
  if (isWeb()) return getWebFileStore().getInfo(path);
  const info = await FileSystem.getInfoAsync(path);
  return {
    exists: info.exists,
    isDirectory: info.exists ? Boolean(info.isDirectory) : false,
    size: info.exists && 'size' in info ? info.size ?? 0 : 0,
  };
}

async function ensureDirectory(path: string): Promise<void> {
  const info = await getInfo(path);
  if (!info.exists) {
    if (isWeb()) {
      await getWebFileStore().makeDirectory(path);
      return;
    }
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

export async function ensureJobDirectories(jobId: string): Promise<{ photos: string; reports: string }> {
  const base = `${JOBS_DIR}${jobId}/`;
  const photos = `${base}photos/`;
  const reports = `${base}reports/`;
  await ensureDirectory(photos);
  await ensureDirectory(reports);
  return { photos, reports };
}

export async function ensureBusinessDirectory(): Promise<string> {
  await ensureDirectory(BUSINESS_DIR);
  return BUSINESS_DIR;
}

export function jobDirectory(jobId: string): string {
  return `${JOBS_DIR}${jobId}/`;
}

export function temporaryFilePath(fileName: string): string {
  if (isWeb()) return `sitereport-cache/${fileName}`;
  return `${FileSystem.cacheDirectory}${fileName}`;
}

/** Copies a local file, blob, or data URI into app storage. Works without a network. */
export async function copyFile(from: string, to: string): Promise<void> {
  if (isWeb()) {
    await getWebFileStore().copy(from, to);
    return;
  }
  const slash = to.lastIndexOf('/');
  if (slash > 0) await ensureDirectory(to.slice(0, slash + 1));
  let lastError: unknown;
  for (const candidate of fileUriReadCandidates(from)) {
    try {
      await FileSystem.copyAsync({ from: candidate, to });
      return;
    } catch (error) {
      lastError = error;
      if (!isUnreadable(error)) throw error;
    }
  }
  // Expo Go on Android often refuses copyAsync for its own document URIs.
  // Read through the fallbacks that already handle those paths, then rewrite.
  const base64 = await readAsBase64(from);
  if (base64) {
    await writeBase64File(to, base64);
    return;
  }
  throw lastError instanceof Error ? lastError : new Error(`Couldn't copy ${from}`);
}

export async function copyIntoJobPhotos(jobId: string, sourceUri: string, fileName: string): Promise<string> {
  const { photos } = await ensureJobDirectories(jobId);
  const destination = `${photos}${fileName}`;
  await copyFile(sourceUri, destination);
  return destination;
}

export async function readBytes(path: string): Promise<Uint8Array | null> {
  if (!isWeb()) {
    try {
      for (const candidate of fileUriReadCandidates(path)) {
        const file = new File(candidate);
        if (!file.exists) continue;
        return await file.bytes();
      }
    } catch (error) {
      logger.warn('Failed to read file bytes', { error: String(error) });
    }
  }
  const base64 = await readAsBase64(path);
  return base64 ? base64ToBytes(base64) : null;
}

export async function writeBytes(path: string, bytes: Uint8Array): Promise<void> {
  if (isWeb()) {
    await getWebFileStore().writeString(path, bytesToBase64(bytes), 'base64');
    return;
  }
  const file = new File(path);
  const parent = path.slice(0, path.lastIndexOf('/') + 1);
  if (parent) {
    const directory = new Directory(parent);
    if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  }
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
}

export async function writeTextFile(path: string, contents: string): Promise<void> {
  if (isWeb()) {
    await getWebFileStore().writeString(path, contents, 'utf8');
    return;
  }
  await ensureDirectory(path.slice(0, path.lastIndexOf('/') + 1));
  await FileSystem.writeAsStringAsync(path, contents, { encoding: FileSystem.EncodingType.UTF8 });
}

export async function writeBase64File(path: string, contents: string): Promise<void> {
  if (isWeb()) {
    await getWebFileStore().writeString(path, contents, 'base64');
    return;
  }
  await ensureDirectory(path.slice(0, path.lastIndexOf('/') + 1));
  await FileSystem.writeAsStringAsync(path, contents, { encoding: FileSystem.EncodingType.Base64 });
}

export async function readTextFile(path: string): Promise<string | null> {
  try {
    if (isWeb()) return getWebFileStore().readString(path, 'utf8');
    return await readNativeFile(path, 'utf8');
  } catch (error) {
    logger.warn('Failed to read text file', { error: String(error) });
    return null;
  }
}

export async function readAsBase64(path: string): Promise<string | null> {
  try {
    if (isWeb()) return getWebFileStore().readString(path, 'base64');
    return await readNativeFile(path, 'base64');
  } catch (error) {
    logger.warn('Failed to read file as base64', { error: String(error) });
    return null;
  }
}

type NativeEncoding = 'utf8' | 'base64';

/**
 * Reads a file kept in app storage.
 *
 * Expo Go's sandbox rejects some of its own `file://` URIs (`isn't readable`),
 * including photos saved under the double-encoded experience directory. When
 * the legacy file-system API refuses, try the other spellings of that URI,
 * then Expo's fetch client, which opens the file directly.
 */
async function readNativeFile(path: string, encoding: NativeEncoding): Promise<string | null> {
  const legacyEncoding = encoding === 'base64' ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8;
  const candidates = fileUriReadCandidates(path);
  let sawFile = false;

  for (const candidate of candidates) {
    const info = await getInfo(candidate).catch(() => null);
    if (!info?.exists || info.isDirectory) continue;
    sawFile = true;
    try {
      return await FileSystem.readAsStringAsync(candidate, { encoding: legacyEncoding });
    } catch (error) {
      if (!isUnreadable(error)) throw error;
    }
  }

  if (!sawFile) return null;

  for (const candidate of candidates) {
    const viaFile = await readViaModernFile(candidate, encoding);
    if (viaFile != null) return viaFile;
    const viaFetch = await readViaExpoFetch(candidate, encoding);
    if (viaFetch != null) return viaFetch;
  }

  if (encoding === 'base64') {
    const viaImage = await readImageViaManipulator(path);
    if (viaImage != null) return viaImage;
  }

  throw new Error(t('files.couldNotRead'));
}

function isUnreadable(error: unknown): boolean {
  return String(error).includes("isn't readable");
}

async function readViaModernFile(path: string, encoding: NativeEncoding): Promise<string | null> {
  try {
    const file = new File(path);
    if (!file.exists) return null;
    return encoding === 'base64' ? await file.base64() : await file.text();
  } catch {
    return null;
  }
}

async function readViaExpoFetch(path: string, encoding: NativeEncoding): Promise<string | null> {
  try {
    const response = await expoFetch(path);
    if (!response.ok) return null;
    if (encoding === 'utf8') return await response.text();
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytesToBase64(bytes);
  } catch {
    return null;
  }
}

async function readImageViaManipulator(path: string): Promise<string | null> {
  const lower = path.toLowerCase();
  if (!lower.endsWith('.jpg') && !lower.endsWith('.jpeg') && !lower.endsWith('.png')) return null;
  try {
    const ImageManipulator = await import('expo-image-manipulator');
    const format = lower.endsWith('.png') ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG;
    for (const candidate of fileUriReadCandidates(path)) {
      try {
        const result = await ImageManipulator.manipulateAsync(candidate, [], { compress: 1, format, base64: true });
        if (result.base64) return result.base64;
      } catch {
        // The next spelling of the URI may be the one the image loader can open.
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Resolves a stored path to something `<Image>` can render. Native file URIs pass through. */
export async function displayUri(path: string): Promise<string | null> {
  if (!isWeb()) return path;
  return getWebFileStore().displayUri(path);
}

export async function deleteFileSafely(path: string | null | undefined): Promise<void> {
  if (!path) return;
  try {
    if (isWeb()) {
      await getWebFileStore().remove(path);
      return;
    }
    const info = await getInfo(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
  } catch (error) {
    logger.warn('Failed to delete file', { error: String(error) });
  }
}

export async function deleteJobFiles(jobId: string): Promise<void> {
  await deleteFileSafely(jobDirectory(jobId));
}

export async function deleteAllAppFiles(): Promise<void> {
  await deleteFileSafely(ROOT);
}

export async function getFileSize(path: string): Promise<number> {
  try {
    const info = await getInfo(path);
    return info.exists ? info.size : 0;
  } catch {
    return 0;
  }
}

export type StorageUsage = { totalBytes: number; freeBytes: number };

export async function getStorageUsage(): Promise<StorageUsage> {
  const [totalBytes, freeBytes] = await Promise.all([
    computeDirectorySize(ROOT),
    isWeb() ? webFreeBytes() : FileSystem.getFreeDiskStorageAsync().catch(() => 0),
  ]);
  return { totalBytes, freeBytes };
}

async function webFreeBytes(): Promise<number> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (!estimate) return 0;
    return Math.max(0, (estimate.quota ?? 0) - (estimate.usage ?? 0));
  } catch {
    return 0;
  }
}

async function computeDirectorySize(path: string): Promise<number> {
  try {
    const info = await getInfo(path);
    if (!info.exists) return 0;
    if (!info.isDirectory) return info.size;
    const entries = isWeb()
      ? await getWebFileStore().readDirectory(path)
      : await FileSystem.readDirectoryAsync(path);
    const prefix = path.endsWith('/') ? path : `${path}/`;
    const sizes = await Promise.all(entries.map((entry) => computeDirectorySize(`${prefix}${entry}`)));
    return sizes.reduce((sum, size) => sum + size, 0);
  } catch {
    return 0;
  }
}

export function generatePhotoFileName(photoId: string, extension = 'jpg'): string {
  return `${photoId}.${extension}`;
}

export function generateThumbnailFileName(photoId: string, extension = 'jpg'): string {
  return `${photoId}_thumb.${extension}`;
}

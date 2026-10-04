import * as FileSystem from 'expo-file-system/legacy';

import { logger } from '@/utils/logger';

const ROOT = `${FileSystem.documentDirectory}sitereport/`;
const JOBS_DIR = `${ROOT}jobs/`;
const BUSINESS_DIR = `${ROOT}business/`;

async function ensureDirectory(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
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

export async function copyIntoJobPhotos(jobId: string, sourceUri: string, fileName: string): Promise<string> {
  const { photos } = await ensureJobDirectories(jobId);
  const destination = `${photos}${fileName}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return destination;
}

export async function writeTextFile(path: string, contents: string): Promise<void> {
  await ensureDirectory(path.slice(0, path.lastIndexOf('/') + 1));
  await FileSystem.writeAsStringAsync(path, contents, { encoding: FileSystem.EncodingType.UTF8 });
}

export async function readTextFile(path: string): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.UTF8 });
  } catch (error) {
    logger.warn('Failed to read text file', { error: String(error) });
    return null;
  }
}

export async function readAsBase64(path: string): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.Base64 });
  } catch (error) {
    logger.warn('Failed to read file as base64', { error: String(error) });
    return null;
  }
}

export async function deleteFileSafely(path: string | null | undefined): Promise<void> {
  if (!path) return;
  try {
    const info = await FileSystem.getInfoAsync(path);
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
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists && 'size' in info) {
      return info.size ?? 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

export type StorageUsage = { totalBytes: number; freeBytes: number };

export async function getStorageUsage(): Promise<StorageUsage> {
  const [totalBytes, freeBytes] = await Promise.all([
    computeDirectorySize(ROOT),
    FileSystem.getFreeDiskStorageAsync().catch(() => 0),
  ]);
  return { totalBytes, freeBytes };
}

async function computeDirectorySize(path: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return 0;
    if (!info.isDirectory) {
      return 'size' in info ? info.size ?? 0 : 0;
    }
    const entries = await FileSystem.readDirectoryAsync(path);
    const sizes = await Promise.all(entries.map((entry) => computeDirectorySize(`${path}${entry}`)));
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

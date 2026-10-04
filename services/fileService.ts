import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { createId } from '@/utils/id';
import { slugify } from '@/utils/file';

const rootDir = `${FileSystem.documentDirectory}sitereport`;
const photosDir = `${rootDir}/photos`;
const reportsDir = `${rootDir}/reports`;
const signaturesDir = `${rootDir}/signatures`;

const ensureDirectory = async (uri: string) => {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
  }
};

const sizeOfUri = async (uri: string): Promise<number> => {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    return 0;
  }

  if (!info.isDirectory) {
    return info.size ?? 0;
  }

  const entries = await FileSystem.readDirectoryAsync(uri);
  const sizes = await Promise.all(entries.map((entry) => sizeOfUri(`${uri}/${entry}`)));
  return sizes.reduce((sum, size) => sum + size, 0);
};

export const fileService = {
  rootDir,
  photosDir,
  reportsDir,
  signaturesDir,

  async init() {
    await Promise.all([ensureDirectory(rootDir), ensureDirectory(photosDir), ensureDirectory(reportsDir), ensureDirectory(signaturesDir)]);
  },

  async importPhoto(sourceUri: string, jobId: string) {
    await ensureDirectory(`${photosDir}/${jobId}`);
    const imageId = createId();
    const outputUri = `${photosDir}/${jobId}/${imageId}.jpg`;
    const thumbUri = `${photosDir}/${jobId}/${imageId}-thumb.jpg`;

    const optimized = await manipulateAsync(
      sourceUri,
      [{ resize: { width: 2200 } }],
      { compress: 0.86, format: SaveFormat.JPEG }
    );
    await FileSystem.copyAsync({ from: optimized.uri, to: outputUri });

    const thumb = await manipulateAsync(
      sourceUri,
      [{ resize: { width: 640 } }],
      { compress: 0.74, format: SaveFormat.JPEG }
    );
    await FileSystem.copyAsync({ from: thumb.uri, to: thumbUri });

    return {
      localUri: outputUri,
      thumbnailUri: thumbUri,
    };
  },

  async replacePhoto(sourceUri: string, existingUri: string, existingThumbUri: string | null) {
    const optimized = await manipulateAsync(
      sourceUri,
      [{ resize: { width: 2200 } }],
      { compress: 0.86, format: SaveFormat.JPEG }
    );
    await FileSystem.copyAsync({ from: optimized.uri, to: existingUri });

    let thumbUri = existingThumbUri;
    if (!thumbUri) {
      thumbUri = existingUri.replace('.jpg', '-thumb.jpg');
    }
    const thumb = await manipulateAsync(
      sourceUri,
      [{ resize: { width: 640 } }],
      { compress: 0.74, format: SaveFormat.JPEG }
    );
    await FileSystem.copyAsync({ from: thumb.uri, to: thumbUri });

    return {
      localUri: existingUri,
      thumbnailUri: thumbUri,
    };
  },

  async saveSignatureFromDataUrl(jobId: string, dataUrl: string) {
    await ensureDirectory(signaturesDir);
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    const uri = `${signaturesDir}/${jobId}-${createId()}.png`;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
    return uri;
  },

  async buildReportPath(fileName: string) {
    await ensureDirectory(reportsDir);
    return `${reportsDir}/${slugify(fileName)}.pdf`;
  },

  async deleteUri(uri: string | null | undefined) {
    if (!uri) {
      return;
    }
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch {
      // Ignore deletion failure, caller will still keep DB consistent.
    }
  },

  async deleteMany(uris: string[]) {
    await Promise.all(uris.map((uri) => this.deleteUri(uri)));
  },

  async getStorageUsage() {
    const [photos, reports, signatures] = await Promise.all([
      sizeOfUri(photosDir),
      sizeOfUri(reportsDir),
      sizeOfUri(signaturesDir),
    ]);
    return {
      photos,
      reports,
      signatures,
      total: photos + reports + signatures,
    };
  },
};

import * as ImageManipulator from 'expo-image-manipulator';

import { copyFile, copyIntoJobPhotos, generatePhotoFileName, generateThumbnailFileName } from './fileService';

/**
 * Balances PDF quality, device storage and performance:
 * - Full photos are capped at 1600px on the long edge and re-encoded as
 *   JPEG at 82% quality — plenty for an A4 report image while keeping
 *   files to a few hundred KB each.
 * - Thumbnails are capped at 320px for fast grid rendering.
 */
const QUALITY_PRESETS = {
  standard: { maxDimension: 1600, quality: 0.82 },
  high: { maxDimension: 2400, quality: 0.9 },
} as const;
const THUMB_MAX_DIMENSION = 320;
const THUMB_QUALITY = 0.6;

export type ProcessedPhoto = {
  localUri: string;
  thumbnailUri: string;
  width: number;
  height: number;
};

function resizeArgsFor(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return undefined;
  }
  if (width >= height) {
    return { width: maxDimension };
  }
  return { height: maxDimension };
}

export async function processJobPhoto(
  jobId: string,
  photoId: string,
  sourceUri: string,
  sourceWidth: number,
  sourceHeight: number,
  quality: 'standard' | 'high' = 'standard'
): Promise<ProcessedPhoto> {
  const preset = QUALITY_PRESETS[quality];
  const fullActions = resizeArgsFor(sourceWidth, sourceHeight, preset.maxDimension);
  const fullResult = await ImageManipulator.manipulateAsync(
    sourceUri,
    fullActions ? [{ resize: fullActions }] : [],
    { compress: preset.quality, format: ImageManipulator.SaveFormat.JPEG }
  );

  const thumbActions = resizeArgsFor(fullResult.width, fullResult.height, THUMB_MAX_DIMENSION);
  const thumbResult = await ImageManipulator.manipulateAsync(
    fullResult.uri,
    thumbActions ? [{ resize: thumbActions }] : [],
    { compress: THUMB_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );

  const localUri = await copyIntoJobPhotos(jobId, fullResult.uri, generatePhotoFileName(photoId));
  const thumbnailUri = await copyIntoJobPhotos(jobId, thumbResult.uri, generateThumbnailFileName(photoId));

  return {
    localUri,
    thumbnailUri,
    width: fullResult.width,
    height: fullResult.height,
  };
}

export async function processBusinessLogo(sourceUri: string, destinationPath: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(sourceUri, [{ resize: { width: 480 } }], {
    compress: 0.9,
    format: ImageManipulator.SaveFormat.PNG,
  });
  await copyFile(result.uri, destinationPath);
  return destinationPath;
}

/** A wide photo for the report cover, stored the same way as the business logo. */
export async function processReportCover(
  sourceUri: string,
  destinationPath: string,
  sourceWidth = 0,
  sourceHeight = 0
): Promise<string> {
  const knownSize = sourceWidth > 0 && sourceHeight > 0;
  const resize = knownSize
    ? resizeArgsFor(sourceWidth, sourceHeight, QUALITY_PRESETS.standard.maxDimension)
    : { width: QUALITY_PRESETS.standard.maxDimension };
  const result = await ImageManipulator.manipulateAsync(sourceUri, resize ? [{ resize }] : [], {
    compress: QUALITY_PRESETS.standard.quality,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  await copyFile(result.uri, destinationPath);
  return destinationPath;
}

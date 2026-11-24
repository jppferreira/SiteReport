import { photosRepository } from '@/database';
import type { Photo } from '@/models';
import { temporaryFilePath, writeBase64File } from '@/services/fileService';
import { processJobPhoto } from '@/services/imageService';
import { resolveTakenAt } from '@/services/photoTakenAt';
import { getPreferences, type MeasureUnit } from '@/services/preferencesService';
import { generateId } from '@/utils/id';

import { measurementCaption } from './formatLength';

type SaveMeasurementPhotoInput = {
  jobId: string;
  areaId: string | null;
  /** Caption for the report; falls back to "<length> — <label>". */
  caption?: string;
  lengthMeters?: number;
  unit?: MeasureUnit;
  label?: string;
} & (
  | { /** Raw base64 JPEG from ExpoArView.snapshot() (no data: prefix). */ base64Jpeg: string; sourceUri?: never }
  | { /** A camera / library photo, used when sizes were typed in by hand. */ sourceUri: string; base64Jpeg?: never; width?: number; height?: number }
);

/** Writes a measured photo into the job as a during photo with its dimensions in the caption. */
export async function saveMeasurementPhoto(input: SaveMeasurementPhotoInput): Promise<Photo> {
  const photoId = generateId();
  let sourceUri = input.sourceUri;
  if (input.base64Jpeg !== undefined) {
    sourceUri = temporaryFilePath(`ar-measure-${photoId}.jpg`);
    await writeBase64File(sourceUri, input.base64Jpeg);
  }
  if (!sourceUri) throw new Error('saveMeasurementPhoto: no image');

  const { defaultPhotoQuality } = await getPreferences();
  // Dimensions are refined by the manipulator; pass a large placeholder so it does not upscale.
  const processed = await processJobPhoto(
    input.jobId,
    photoId,
    sourceUri,
    'width' in input && input.width ? input.width : 2400,
    'height' in input && input.height ? input.height : 1800,
    defaultPhotoQuality
  );

  const caption = input.caption?.trim()
    || measurementCaption(input.lengthMeters ?? 0, input.unit ?? 'm', input.label ?? '');

  return photosRepository.addPhoto({
    jobId: input.jobId,
    areaId: input.areaId,
    type: 'during',
    localUri: processed.localUri,
    thumbnailUri: processed.thumbnailUri,
    caption,
    width: processed.width,
    height: processed.height,
    takenAt: resolveTakenAt({ source: 'camera', exif: null, capturedAt: new Date().toISOString() }),
  });
}

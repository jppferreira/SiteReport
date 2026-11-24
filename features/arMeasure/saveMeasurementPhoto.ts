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
  /** Raw base64 JPEG from ExpoArView.snapshot() (no data: prefix). */
  base64Jpeg: string;
  lengthMeters: number;
  unit: MeasureUnit;
  label: string;
};

/** Writes an AR snapshot into the job as a during photo with a length caption. */
export async function saveMeasurementPhoto(input: SaveMeasurementPhotoInput): Promise<Photo> {
  const photoId = generateId();
  const tempUri = temporaryFilePath(`ar-measure-${photoId}.jpg`);
  await writeBase64File(tempUri, input.base64Jpeg);

  const { defaultPhotoQuality } = await getPreferences();
  // Dimensions are refined by the manipulator; pass a large placeholder so it does not upscale.
  const processed = await processJobPhoto(
    input.jobId,
    photoId,
    tempUri,
    2400,
    1800,
    defaultPhotoQuality
  );

  return photosRepository.addPhoto({
    jobId: input.jobId,
    areaId: input.areaId,
    type: 'during',
    localUri: processed.localUri,
    thumbnailUri: processed.thumbnailUri,
    caption: measurementCaption(input.lengthMeters, input.unit, input.label),
    width: processed.width,
    height: processed.height,
    takenAt: resolveTakenAt({ source: 'camera', exif: null, capturedAt: new Date().toISOString() }),
  });
}

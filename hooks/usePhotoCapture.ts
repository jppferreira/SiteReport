import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { photosRepository } from '@/database';
import { requestPhotoLibraryAccess } from '@/services/photoLibraryAccess';
import { Photo, PhotoType } from '@/models';
import { processJobPhoto } from '@/services/imageService';
import { resolveTakenAt } from '@/services/photoTakenAt';
import { getPreferences } from '@/services/preferencesService';
import { generateId } from '@/utils/id';
import { logger } from '@/utils/logger';

export type CaptureSource = 'camera' | 'library';

export type PermissionDenialReason = 'camera' | 'library' | null;

export function usePhotoCapture(
  jobId: string,
  type: PhotoType,
  areaId: string | null,
  onAdded: (photo: Photo) => void
) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState<PermissionDenialReason>(null);

  const capture = useCallback(
    async (source: CaptureSource) => {
      setError(null);
      setPermissionDenied(null);

      try {
        let result: ImagePicker.ImagePickerResult;

        let capturedAt: string | null = null;
        if (source === 'camera') {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            setPermissionDenied('camera');
            return;
          }
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 1,
            allowsEditing: false,
            exif: true,
          });
          capturedAt = new Date().toISOString();
        } else {
          const allowed = await requestPhotoLibraryAccess();
          if (!allowed) {
            setPermissionDenied('library');
            return;
          }
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 1,
            allowsMultipleSelection: true,
            selectionLimit: 24,
            exif: true,
          });
        }

        if (result.canceled || result.assets.length === 0) return;

        setProcessing(true);
        const { defaultPhotoQuality } = await getPreferences();
        for (const asset of result.assets) {
          const photoId = generateId();
          const takenAt = resolveTakenAt({ source, exif: asset.exif, capturedAt });
          const processed = await processJobPhoto(jobId, photoId, asset.uri, asset.width, asset.height, defaultPhotoQuality);
          const photo = await photosRepository.addPhoto({
            jobId,
            areaId,
            type,
            localUri: processed.localUri,
            thumbnailUri: processed.thumbnailUri,
            caption: null,
            width: processed.width,
            height: processed.height,
            takenAt,
          });
          onAdded(photo);
        }
      } catch (err) {
        logger.error('Photo capture failed', err);
        setError("We couldn't add that photo. Try again.");
      } finally {
        setProcessing(false);
      }
    },
    [areaId, jobId, type, onAdded]
  );

  return { capture, processing, error, permissionDenied, clearPermissionDenied: () => setPermissionDenied(null) };
}

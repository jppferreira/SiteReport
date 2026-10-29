import { useCallback, useEffect, useRef, useState } from 'react';

import { photosRepository } from '@/database';
import { Photo, PhotoType } from '@/models';
import { logger } from '@/utils/logger';

type PhotoScope = {
  /** Null lists photos that cover the whole job. Omit the option to list every photo of this type. */
  areaId?: string | null;
  enabled?: boolean;
};

export function usePhotos(jobId: string, type: PhotoType, scope?: PhotoScope) {
  const enabled = scope?.enabled !== false;
  const filtersArea = scope != null && Object.prototype.hasOwnProperty.call(scope, 'areaId');
  const areaId = filtersArea ? scope?.areaId ?? null : undefined;
  const requestKey = !enabled ? null : `${jobId}|${type}|${areaId === undefined ? 'all' : areaId ?? 'none'}`;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!requestKey) return;
    const id = ++requestId.current;
    const key = requestKey;
    setError(null);
    try {
      const result =
        areaId === undefined
          ? await photosRepository.listPhotos(jobId, type)
          : await photosRepository.listPhotos(jobId, type, areaId);
      if (requestId.current !== id) return;
      setPhotos(result);
      setLoadedKey(key);
    } catch (err) {
      if (requestId.current !== id) return;
      logger.error('Failed to load photos', err);
      setPhotos([]);
      setLoadedKey(key);
      setError("We couldn't load these photos.");
    }
  }, [areaId, jobId, requestKey, type]);

  useEffect(() => {
    // Fetch when the section or type changes. `refresh` records which request finished.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const ready = requestKey !== null && loadedKey === requestKey;
  return {
    photos: ready ? photos : [],
    loading: requestKey !== null && !ready,
    error: ready ? error : null,
    refresh,
  };
}

export function useJobPhotos(jobId: string) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setPhotos(await photosRepository.listPhotos(jobId));
    } catch (err) {
      logger.error('Failed to load photos', err);
      setError("We couldn't load these photos.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { photos, loading, error, refresh };
}

import { useCallback, useEffect, useState } from 'react';

import { photosRepository } from '@/database';
import { Photo, PhotoType } from '@/models';
import { logger } from '@/utils/logger';

export function usePhotos(jobId: string, type: PhotoType) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await photosRepository.listPhotos(jobId, type);
      setPhotos(result);
    } catch (err) {
      logger.error('Failed to load photos', err);
      setError("We couldn't load these photos.");
    } finally {
      setLoading(false);
    }
  }, [jobId, type]);

  useEffect(() => {
    // Fetch on mount; `refresh` manages its own loading/error state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { photos, loading, error, refresh };
}

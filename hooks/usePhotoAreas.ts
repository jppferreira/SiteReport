import { useCallback, useEffect, useState } from 'react';

import { photoAreasRepository } from '@/database';
import { PhotoArea } from '@/models';
import { logger } from '@/utils/logger';

export function usePhotoAreas(jobId: string) {
  const [areas, setAreas] = useState<PhotoArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const result = await photoAreasRepository.listAreas(jobId);
      setAreas(result);
    } catch (err) {
      logger.error('Failed to load photo sections', err);
      setError("We couldn't load these sections.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { areas, loading, error, refresh };
}

export function usePhotoArea(areaId: string | null) {
  const [area, setArea] = useState<PhotoArea | null>(null);
  const [loading, setLoading] = useState(areaId !== null);
  const [missing, setMissing] = useState(false);

  const refresh = useCallback(async () => {
    if (!areaId) {
      setArea(null);
      setMissing(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const found = await photoAreasRepository.getArea(areaId);
      setArea(found);
      setMissing(!found);
    } catch (err) {
      logger.error('Failed to load photo section', err);
      setArea(null);
      setMissing(true);
    } finally {
      setLoading(false);
    }
  }, [areaId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { area, loading, missing, refresh, setArea };
}

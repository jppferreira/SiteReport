import { useCallback, useEffect, useState } from 'react';

import { businessProfileRepository } from '@/database';
import { BusinessProfile } from '@/models';
import { logger } from '@/utils/logger';

export function useBusinessProfile() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await businessProfileRepository.getBusinessProfile();
      setProfile(result);
    } catch (err) {
      logger.error('Failed to load business profile', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async (patch: Partial<Omit<BusinessProfile, 'updatedAt'>>) => {
    const next = await businessProfileRepository.saveBusinessProfile(patch);
    setProfile(next);
    return next;
  }, []);

  return { profile, loading, save, refresh };
}

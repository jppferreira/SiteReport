import { useCallback, useEffect, useState } from 'react';

import { signatureRepository } from '@/database';
import { Signature } from '@/models';
import { logger } from '@/utils/logger';

export function useSignature(jobId: string) {
  const [signature, setSignature] = useState<Signature | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await signatureRepository.getSignature(jobId);
      setSignature(result);
    } catch (err) {
      logger.error('Failed to load signature', err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    // Fetch on mount; `refresh` manages its own loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { signature, loading, refresh };
}

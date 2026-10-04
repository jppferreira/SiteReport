import { useCallback, useEffect, useState } from 'react';

import { workSummaryRepository } from '@/database';
import { WorkSummary } from '@/models';
import { logger } from '@/utils/logger';

export function useWorkSummary(jobId: string) {
  const [summary, setSummary] = useState<WorkSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await workSummaryRepository.getWorkSummary(jobId);
      setSummary(result);
    } catch (err) {
      logger.error('Failed to load work summary', err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (patch: Partial<Pick<WorkSummary, 'workCompleted' | 'materials' | 'recommendations' | 'notes'>>) => {
      const next = await workSummaryRepository.saveWorkSummary(jobId, patch);
      setSummary(next);
      return next;
    },
    [jobId]
  );

  return { summary, loading, save, refresh };
}

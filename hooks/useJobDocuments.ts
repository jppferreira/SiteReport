import { useCallback, useEffect, useState } from 'react';

import { documentsRepository } from '@/database';
import type { TradeDocument } from '@/models';

export function useJobDocuments(jobId: string | undefined) {
  const [documents, setDocuments] = useState<TradeDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (silent = false) => {
    if (!jobId) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const result = await documentsRepository.listDocumentsForJob(jobId);
      setDocuments(result);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const refreshOnFocus = useCallback(() => refresh(true), [refresh]);

  return { documents, loading, refresh, refreshOnFocus };
}
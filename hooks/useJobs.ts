import { useCallback, useEffect, useState } from 'react';

import { jobsRepository, photosRepository } from '@/database';
import { JobPhotoSummary } from '@/database/repositories/photosRepository';
import { Job } from '@/models';
import { logger } from '@/utils/logger';

export type JobsFilter = 'all' | 'draft' | 'complete';

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [photoSummaries, setPhotoSummaries] = useState<Record<string, JobPhotoSummary>>({});
  const [filter, setFilter] = useState<JobsFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (nextFilter?: JobsFilter, nextSearch?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await jobsRepository.listJobs(nextFilter ?? filter, nextSearch ?? search);
      setJobs(result);
      const summaries = await photosRepository.getJobPhotoSummaries(result.map((j) => j.id));
      setPhotoSummaries(summaries);
    } catch (err) {
      logger.error('Failed to load jobs', err);
      setError("We couldn't load your jobs. Try again.");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    refresh(filter, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search]);

  return {
    jobs,
    photoSummaries,
    filter,
    setFilter,
    search,
    setSearch,
    loading,
    error,
    refresh: () => refresh(),
  };
}

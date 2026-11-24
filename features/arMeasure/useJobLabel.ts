import { useEffect, useState } from 'react';

import { jobsRepository } from '@/database';

/** "Hall & kitchen refit · 14 Elm Rd" for the save sheet. */
export function useJobLabel(jobId: string): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    let cancelled = false;
    jobsRepository.getJob(jobId).then((job) => {
      if (!cancelled && job) setLabel([job.title, job.address?.split(/[,\n]/)[0]?.trim()].filter(Boolean).join(' · '));
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [jobId]);
  return label;
}

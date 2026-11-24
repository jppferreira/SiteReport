import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { ErrorState, LoadingState, NavigationHeader, Screen } from '@/components';
import { jobChecklistsRepository, jobsRepository } from '@/database';
import { JobChecklistView } from '@/features/checklists/JobChecklistScreen';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useI18n } from '@/i18n/useI18n';
import { Job, JobChecklist } from '@/models';
import { goBack } from '@/utils/goBack';

export default function JobChecklistRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const { isPro, loading: entitlementLoading } = useEntitlement();
  const [job, setJob] = useState<Job | null>(null);
  const [checklist, setChecklist] = useState<JobChecklist | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    // Wait until Pro status is known — defaulting to free here kicked Pro testers to the paywall.
    if (entitlementLoading) return;
    if (!isPro) {
      router.replace({ pathname: '/paywall', params: { trigger: 'checklist' } });
      return;
    }
    let cancelled = false;
    (async () => {
      const loaded = await jobsRepository.getJob(id);
      if (cancelled) return;
      if (!loaded) {
        setMissing(true);
        return;
      }
      const list = await jobChecklistsRepository.ensureChecklist(loaded.id);
      if (cancelled) return;
      setJob(loaded);
      setChecklist(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isPro, entitlementLoading]);

  if (missing) {
    return (
      <Screen>
        <NavigationHeader title={t('checklist.title')} onBack={() => goBack('/(tabs)/jobs')} />
        <ErrorState title={t('jobDetail.notFound')} onAction={() => goBack('/(tabs)/jobs')} actionLabel={t('common.goBack')} />
      </Screen>
    );
  }

  if (entitlementLoading || !job || !checklist) {
    return (
      <Screen>
        <NavigationHeader title={t('checklist.title')} onBack={() => goBack(`/(tabs)/jobs`)} />
        <LoadingState />
      </Screen>
    );
  }

  return <JobChecklistView job={job} initial={checklist} />;
}

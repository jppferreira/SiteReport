import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { ArMeasureScreen } from '@/features/arMeasure';
import { isWholeJobArea } from '@/models';

/** AR Measure + Level for a job. `?areaId=` files saved photos under that section; `?mode=level` opens the level. */
export default function JobMeasureScreen() {
  const { id, areaId: areaParam, mode } = useLocalSearchParams<{ id: string; areaId?: string; mode?: string }>();
  const jobId = Array.isArray(id) ? id[0] ?? '' : id;
  const rawArea = Array.isArray(areaParam) ? areaParam[0] : areaParam;
  const areaId = rawArea && !isWholeJobArea(rawArea) ? rawArea : null;
  const close = () => (router.canGoBack() ? router.back() : router.replace(`/job/${jobId}`));

  return (
    <>
      <StatusBar style="light" />
      <ArMeasureScreen jobId={jobId} areaId={areaId} initialMode={mode === 'level' ? 'level' : 'measure'} onClose={close} onSaved={close} />
    </>
  );
}

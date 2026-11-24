import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { ArMeasureScreen } from '@/features/arMeasure';
import { isWholeJobArea } from '@/models';

/** AR Measure + Level for a job. `?areaId=` files saved photos under that section; `?mode=level` opens the level; `?demo=1` shows the door demo for store shots. */
export default function JobMeasureScreen() {
  const { id, areaId: areaParam, mode, demo } = useLocalSearchParams<{
    id: string;
    areaId?: string;
    mode?: string;
    demo?: string;
  }>();
  const jobId = Array.isArray(id) ? id[0] ?? '' : id;
  const rawArea = Array.isArray(areaParam) ? areaParam[0] : areaParam;
  const areaId = rawArea && !isWholeJobArea(rawArea) ? rawArea : null;
  const demoFlag = (Array.isArray(demo) ? demo[0] : demo) === '1';
  const close = () => (router.canGoBack() ? router.back() : router.replace(`/job/${jobId}`));

  return (
    <>
      <StatusBar style="light" />
      <ArMeasureScreen
        jobId={jobId}
        areaId={areaId}
        initialMode={mode === 'level' ? 'level' : 'measure'}
        demo={demoFlag}
        onClose={close}
        onSaved={close}
      />
    </>
  );
}

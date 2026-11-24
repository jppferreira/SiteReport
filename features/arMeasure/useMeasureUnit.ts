import { useCallback, useEffect, useState } from 'react';

import { getPreferences, savePreferences, type MeasureUnit } from '@/services/preferencesService';

/** The user's AR Measure unit, persisted in app preferences. */
export function useMeasureUnit() {
  const [unit, setUnitState] = useState<MeasureUnit>('m');
  useEffect(() => {
    let cancelled = false;
    getPreferences().then((prefs) => {
      if (!cancelled) setUnitState(prefs.measureUnit);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  const setUnit = useCallback((next: MeasureUnit) => {
    setUnitState(next);
    void savePreferences({ measureUnit: next }).catch(() => undefined);
  }, []);
  return [unit, setUnit] as const;
}

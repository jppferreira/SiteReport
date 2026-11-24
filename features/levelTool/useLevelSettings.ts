import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { parseCalibration, type CalibrationOffset, type CalibrationOffsets } from './levelCalibration';
import type { LevelOrientation } from './levelOrientation';
import { normaliseLevelUnit, type LevelUnit } from './levelUnits';

const STORAGE_KEY = 'levelTool.settings.v1';

export type LevelSettings = {
  unit: LevelUnit;
  haptics: boolean;
  sound: boolean;
  calibration: CalibrationOffsets;
};

export const DEFAULT_LEVEL_SETTINGS: LevelSettings = {
  unit: 'deg',
  haptics: true,
  sound: false,
  calibration: {},
};

export function parseLevelSettings(raw: string | null): LevelSettings {
  if (!raw) return DEFAULT_LEVEL_SETTINGS;
  try {
    const value = JSON.parse(raw) as Partial<LevelSettings>;
    return {
      unit: normaliseLevelUnit(value.unit),
      haptics: value.haptics !== false,
      sound: value.sound === true,
      calibration: parseCalibration(value.calibration),
    };
  } catch {
    return DEFAULT_LEVEL_SETTINGS;
  }
}

/** Level unit, haptics, sound and per-orientation Zero, persisted on this device. */
export function useLevelSettings() {
  const [settings, setSettings] = useState<LevelSettings>(DEFAULT_LEVEL_SETTINGS);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!cancelled) setSettings(parseLevelSettings(raw));
      })
      .catch(() => undefined)
      .finally(() => {
        loadedRef.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: (prev: LevelSettings) => LevelSettings) => {
    setSettings((prev) => {
      const next = patch(prev);
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const setUnit = useCallback((unit: LevelUnit) => update((s) => ({ ...s, unit })), [update]);
  const toggleHaptics = useCallback(() => update((s) => ({ ...s, haptics: !s.haptics })), [update]);
  const toggleSound = useCallback(() => update((s) => ({ ...s, sound: !s.sound })), [update]);
  const setZero = useCallback(
    (orientation: LevelOrientation, offset: CalibrationOffset | null) =>
      update((s) => {
        const calibration = { ...s.calibration };
        if (offset) calibration[orientation] = offset;
        else delete calibration[orientation];
        return { ...s, calibration };
      }),
    [update]
  );

  return { settings, setUnit, toggleHaptics, toggleSound, setZero };
}

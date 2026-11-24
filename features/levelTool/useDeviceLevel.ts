import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { type LevelReading, readingFromAcceleration, smoothReading } from './levelMath';

export type DeviceLevelState = {
  reading: LevelReading | null;
  available: boolean | null;
  /** True once we have received at least one accelerometer sample. */
  ready: boolean;
};

const UPDATE_MS = 50;

type AccelerometerModule = {
  isAvailableAsync: () => Promise<boolean>;
  setUpdateInterval: (ms: number) => void;
  addListener: (listener: (data: { x: number; y: number; z: number }) => void) => { remove: () => void };
};

/**
 * Load Accelerometer only — importing `expo-sensors` pulls Pedometer too, and
 * both throw at module load when ExpoSensors isn't linked in this binary.
 */
async function loadAccelerometer(): Promise<AccelerometerModule | null> {
  if (Platform.OS === 'web') return null;
  try {
    const mod = await import('expo-sensors/build/Accelerometer');
    return mod.default as AccelerometerModule;
  } catch {
    return null;
  }
}

/**
 * Live spirit-level reading from the device accelerometer.
 * Needs a physical device — simulators usually report no motion.
 */
export function useDeviceLevel(enabled: boolean): DeviceLevelState {
  const [reading, setReading] = useState<LevelReading | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const smoothedRef = useRef<LevelReading | null>(null);

  useEffect(() => {
    if (!enabled) {
      smoothedRef.current = null;
      setReading(null);
      setReady(false);
      return;
    }

    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    const start = async () => {
      const Accelerometer = await loadAccelerometer();
      if (cancelled) return;
      if (!Accelerometer) {
        setAvailable(false);
        return;
      }

      let isAvailable = false;
      try {
        isAvailable = await Accelerometer.isAvailableAsync();
      } catch {
        isAvailable = false;
      }
      if (cancelled) return;
      setAvailable(isAvailable);
      if (!isAvailable) return;

      Accelerometer.setUpdateInterval(UPDATE_MS);
      subscription = Accelerometer.addListener((data) => {
        const raw = readingFromAcceleration(data.x, data.y, data.z);
        const smoothed = smoothReading(smoothedRef.current, raw);
        smoothedRef.current = smoothed;
        setReading(smoothed);
        setReady(true);
      });
    };

    void start();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);

  return { reading, available, ready };
}

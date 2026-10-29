import { AccessibilityInfo } from 'react-native';
import { makeMutable, withTiming, type AnimationCallback, type WithTimingConfig } from 'react-native-reanimated';

/**
 * OS "Reduce Motion" flag, readable from the UI thread.
 *
 * Worklets must read `reduceMotion.value` directly. Calling `isMotionReduced`
 * or `motionTiming` from a worklet makes Worklets throw
 * "Tried to synchronously call a remote function" on Expo Go. Those helpers
 * stay plain JS functions because press handlers and effects run on the JS thread.
 */
export const reduceMotion = makeMutable(false);

AccessibilityInfo.isReduceMotionEnabled?.()
  .then((enabled) => {
    reduceMotion.value = enabled;
  })
  .catch(() => undefined);

AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  reduceMotion.value = enabled;
});

/** Drop-in replacement for Reanimated's `withTiming` that respects Reduce Motion. JS thread only. */
export function motionTiming(toValue: number, config?: WithTimingConfig, callback?: AnimationCallback) {
  return withTiming(toValue, reduceMotion.value ? { ...config, duration: 0 } : config, callback);
}

/** True when the OS asks for reduced motion. JS thread only. */
export function isMotionReduced() {
  return reduceMotion.value;
}

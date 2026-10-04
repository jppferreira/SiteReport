import { AccessibilityInfo } from 'react-native';
import { makeMutable, withTiming, type AnimationCallback, type WithTimingConfig } from 'react-native-reanimated';

/**
 * Tracks the OS "Reduce Motion" accessibility setting so Reanimated
 * transitions can collapse to an instant change instead of animating. Uses a
 * shared value (rather than a plain module variable) so it can be read
 * safely from worklets running on the UI thread, e.g. gesture callbacks.
 */
const reduceMotionSV = makeMutable(false);

AccessibilityInfo.isReduceMotionEnabled?.()
  .then((enabled) => {
    reduceMotionSV.value = enabled;
  })
  .catch(() => undefined);

AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  reduceMotionSV.value = enabled;
});

/** Drop-in replacement for Reanimated's `withTiming` that respects Reduce Motion. Safe to call from worklets. */
export function motionTiming(toValue: number, config?: WithTimingConfig, callback?: AnimationCallback) {
  'worklet';
  return withTiming(toValue, reduceMotionSV.value ? { ...config, duration: 0 } : config, callback);
}

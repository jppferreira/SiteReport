import { useEffect, useState } from 'react';
import { Dimensions, Platform, ScaledSize } from 'react-native';

/**
 * iPad breakpoint detection and size classification.
 *
 * Trade Report treats devices with:
 * - width >= 768 as tablet (matches iPad Mini 8.3″ portrait at 744pt × 1133pt)
 * - width < 1024 (in portrait) as compact (11″ iPad portrait is 834pt)
 * - width >= 1024 as regular (12.9″ iPad portrait is 1024pt, 11″ landscape is 1194pt)
 *
 * On web, the useragent Platform.isPad check won't work, so we rely on dimensions alone.
 */

export type TabletBreakpoint = {
  /** True when running on a tablet-sized device (width >= 768). */
  isTablet: boolean;
  /** True when width < 1024 (11″ portrait or smaller). Used for icon-only rail. */
  isCompact: boolean;
  /** True when width >= 1024 (12.9″ portrait, or 11″ landscape). */
  isRegular: boolean;
  /** True when height < width (landscape orientation). */
  isLandscape: boolean;
  /** Current window dimensions. */
  dimensions: ScaledSize;
};

function classify(window: ScaledSize): TabletBreakpoint {
  const { width, height } = window;
  const isTablet = width >= 768;
  const isCompact = width < 1024;
  const isRegular = width >= 1024;
  const isLandscape = width > height;

  return {
    isTablet,
    isCompact,
    isRegular,
    isLandscape,
    dimensions: window,
  };
}

/**
 * Hook that returns the current tablet breakpoint state and updates on
 * orientation change or window resize.
 */
export function useTabletBreakpoint(): TabletBreakpoint {
  const [breakpoint, setBreakpoint] = useState(() => classify(Dimensions.get('window')));

  useEffect(() => {
    const handleChange = ({ window }: { window: ScaledSize }) => {
      setBreakpoint(classify(window));
    };

    const subscription = Dimensions.addEventListener('change', handleChange);
    return () => subscription.remove();
  }, []);

  return breakpoint;
}

/**
 * Returns true when the device is an iPad (iOS) or a tablet-sized screen (Android/Web).
 * Useful for one-time checks during render.
 */
export function isTabletDevice(): boolean {
  if (Platform.OS === 'ios' && Platform.isPad) return true;
  const { width } = Dimensions.get('window');
  return width >= 768;
}

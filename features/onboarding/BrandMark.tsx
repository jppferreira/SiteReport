import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

/**
 * Minimal brand mark: a document with a confirming checkmark and a camera
 * aperture dot, standing in for "proof of work" without any trade-specific
 * iconography (no helmets/hammers), so it reads as useful across trades.
 */
export function BrandMark({ size = 96 }: { size?: number }) {
  const { colors, radius } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <Rect x="2" y="2" width="92" height="92" rx={radius.xl} fill={colors.ctaDark} />
      <Rect x="28" y="22" width="40" height="52" rx="4" fill="#FFFFFF" />
      <Rect x="34" y="32" width="20" height="3" rx="1.5" fill={colors.border} />
      <Rect x="34" y="40" width="28" height="3" rx="1.5" fill={colors.border} />
      <Rect x="34" y="48" width="22" height="3" rx="1.5" fill={colors.border} />
      <Circle cx="64" cy="64" r="16" fill={colors.accent} />
      <Path
        d="M57 64.5 L62 69.5 L71 58.5"
        stroke="#0B1F10"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

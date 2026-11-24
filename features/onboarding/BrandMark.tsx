import { Image } from 'expo-image';
import React from 'react';

import { useI18n } from '@/i18n/useI18n';

/** App mark — same asset as the launcher / splash brand mark. */
const SOURCE = require('../../assets/images/brand-mark.png');

/** Matches the LaunchSplash / iOS continuous-corner factor. */
const CORNER = 0.2237;

export function BrandMark({ size = 72 }: { size?: number }) {
  const { t } = useI18n();

  return (
    <Image
      source={SOURCE}
      accessibilityRole="image"
      accessibilityLabel={t('onboarding.brandMarkA11y')}
      contentFit="cover"
      style={{ width: size, height: size, borderRadius: size * CORNER }}
    />
  );
}

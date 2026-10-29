import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

import { useI18n } from '@/i18n/useI18n';

/**
 * App mark from the Trade Report icon (Figma node 1:17).
 * The exported image is larger than the frame; these offsets reproduce that crop.
 */
const SOURCE = require('../../assets/images/brand-mark.png');

const FRAME_W = 1056;
const FRAME_H = 1068;
const IMAGE_PX = 1254;
const CROP_X = 98;
const CROP_Y = 87;

export function BrandMark({ size = 72 }: { size?: number }) {
  const { t } = useI18n();
  const height = size;
  const width = (size * FRAME_W) / FRAME_H;
  const scale = height / FRAME_H;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={t('onboarding.brandMarkA11y')}
      style={{ width, height, overflow: 'hidden', position: 'relative' }}
    >
      <Image
        source={SOURCE}
        contentFit="fill"
        style={{
          position: 'absolute',
          width: IMAGE_PX * scale,
          height: IMAGE_PX * scale,
          left: -CROP_X * scale,
          top: -CROP_Y * scale,
        }}
      />
    </View>
  );
}

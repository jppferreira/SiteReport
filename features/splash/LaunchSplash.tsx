import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text as RNText, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { BrandMark } from '@/features/onboarding/BrandMark';
import { useI18n } from '@/i18n/useI18n';
import { fontFamily } from '@/theme';

/**
 * Figma "Trade Report — Landing" (node 1:19), 390×844.
 * The mark is the shared brand-mark asset (same file as the frame's logo).
 * The crew is that frame's illustration, cropped the same way at the bottom.
 */
const DESIGN_W = 390;
const DESIGN_H = 844;

const MARK = { x: 133, y: 155, height: 126 };
const LOCKUP = { y: 301, gap: 4, title: 34.93, titleLine: 44, tagline: 12, taglineLine: 15 };
const CREW = { x: -83, y: 430, width: 590, height: 492, bleed: 78 };

const CANVAS = '#E7FCEE';
const WASH = 'rgb(104, 232, 198)';
const INK = '#000000';
const REPORT = '#02885D';

const CREW_IMAGE = require('../../assets/images/splash-crew.png');

export function LaunchSplash() {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const scale = Math.min(width / DESIGN_W, height / DESIGN_H);
  const offsetX = (width - DESIGN_W * scale) / 2;
  const crewTop = Math.max(CREW.y * scale, height - (CREW.height - CREW.bleed) * scale);

  return (
    <View
      style={styles.root}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={t('splash.accessibilityLabel')}
    >
      <SplashBackground width={width} height={height} />

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute',
          left: offsetX + MARK.x * scale,
          top: MARK.y * scale,
          boxShadow: `0px ${14 * scale}px ${14 * scale}px rgba(24, 215, 183, 0.09), 0px ${3 * scale}px ${8 * scale}px rgba(24, 215, 183, 0.1)`,
          borderRadius: MARK.height * scale * 0.2237,
        }}
      >
        <BrandMark size={MARK.height * scale} />
      </View>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute',
          left: offsetX,
          top: LOCKUP.y * scale,
          width: DESIGN_W * scale,
          paddingHorizontal: 16 * scale,
          alignItems: 'center',
          gap: LOCKUP.gap * scale,
        }}
      >
        <RNText
          allowFontScaling={false}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={[styles.word, { width: '100%', fontSize: LOCKUP.title * scale, lineHeight: LOCKUP.titleLine * scale, color: INK }]}
        >
          {t('splash.wordmarkTrade')}{' '}
          <RNText style={{ color: REPORT }}>{t('splash.wordmarkReport')}</RNText>
        </RNText>
        <RNText
          allowFontScaling={false}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={[styles.tagline, { width: '100%', fontSize: LOCKUP.tagline * scale, lineHeight: LOCKUP.taglineLine * scale }]}
        >
          {t('splash.tagline')}
        </RNText>
      </View>

      <Image
        source={CREW_IMAGE}
        contentFit="cover"
        accessibilityElementsHidden
        importantForAccessibility="no"
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: offsetX + CREW.x * scale,
          top: crewTop,
          width: CREW.width * scale,
          height: CREW.height * scale,
        }}
      />
    </View>
  );
}

function SplashBackground({ width, height }: { width: number; height: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: CANVAS }]} />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="splashWash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={WASH} stopOpacity={0.2} />
            <Stop offset="53.851%" stopColor={WASH} stopOpacity={0} />
            <Stop offset="100%" stopColor={WASH} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#splashWash)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CANVAS,
    overflow: 'hidden',
  },
  word: {
    fontFamily: fontFamily.bold,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: fontFamily.regular,
    color: INK,
    opacity: 0.5,
    textAlign: 'center',
  },
});

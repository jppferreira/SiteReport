import { Image, type ImageSource } from 'expo-image';
import React, { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n/useI18n';

import { Text } from '@/components';
import { fontFamily, useTheme } from '@/theme';

import { StepDots } from './StepDots';

const CARD_HEIGHT = 304;
const CARD_OVERLAP = 56;
const NEXT_SIZE = 56;
const CARD_RADIUS = 28;
const FADE_OUT_MS = 180;
const FADE_IN_MS = 220;

export type HeroOnboardingStep = {
  image: ImageSource;
  imageLabel: string;
  title: string;
  subtitle: string;
  body: string;
};

type HeroOnboardingScreenProps = {
  steps: HeroOnboardingStep[];
  /** Total steps including non-hero screens (e.g. profile). */
  totalSteps?: number;
  onComplete: () => void;
};

export function HeroOnboardingScreen({ steps, totalSteps = 6, onComplete }: HeroOnboardingScreenProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const busyRef = useRef(false);
  const [contentOpacity] = useState(() => new Animated.Value(1));

  const bottomPad = Math.max(insets.bottom, 24);
  const cardHeight = CARD_HEIGHT + Math.max(0, bottomPad - 24);
  const heroBottom = Math.max(0, cardHeight - CARD_OVERLAP);
  const step = steps[index]!;
  const stepNumber = index + 1;

  const clearBusy = () => {
    busyRef.current = false;
  };

  const fadeIn = () => {
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: FADE_IN_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) clearBusy();
      else clearBusy();
    });
  };

  const showStep = (nextIndex: number) => {
    setIndex(nextIndex);
    fadeIn();
  };

  const goNext = () => {
    if (busyRef.current) return;
    if (index >= steps.length - 1) {
      onComplete();
      return;
    }

    busyRef.current = true;
    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        clearBusy();
        return;
      }
      showStep(index + 1);
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.hero, { bottom: heroBottom, opacity: contentOpacity }]}>
        <Image source={step.image} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={step.imageLabel} />
      </Animated.View>

      <View
        style={[
          styles.card,
          {
            height: cardHeight,
            paddingBottom: bottomPad,
            backgroundColor: colors.backgroundElevated,
            width,
          },
        ]}
      >
        <Animated.View style={[styles.copy, { opacity: contentOpacity }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
            {step.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{step.subtitle}</Text>
          <Text style={[styles.body, { color: colors.textTertiary }]}>{step.body}</Text>
        </Animated.View>

        <View style={styles.navRow}>
          <View style={styles.navSide} />
          <View style={styles.dotsWrap}>
            <StepDots step={stepNumber} totalSteps={totalSteps} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.heroNext')}
            onPress={goNext}
            hitSlop={8}
            style={({ pressed }) => [
              styles.next,
              {
                backgroundColor: pressed ? colors.accentPressed : colors.accent,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
          >
            <Text style={[styles.nextLabel, { color: colors.accentOnAccent }]}>→</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  card: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    paddingHorizontal: 28,
    paddingTop: 32,
    justifyContent: 'space-between',
  },
  copy: {
    gap: 6,
    alignItems: 'center',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navSide: {
    width: NEXT_SIZE,
    height: NEXT_SIZE,
  },
  dotsWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  next: {
    width: NEXT_SIZE,
    height: NEXT_SIZE,
    borderRadius: NEXT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 22,
    lineHeight: 26,
  },
});

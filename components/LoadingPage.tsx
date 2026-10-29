import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { Screen } from './Screen';
import { Text } from './Text';

const MUG = require('../assets/images/coffee-mug.png');

/** Figma "00d · Loading" (97:14) hero frame. */
const MUG_WIDTH = 248;
const MUG_HEIGHT = 210;

type LoadingPageProps = {
  label?: string;
};

/**
 * Full-screen wait state from the app loader: wordmark, status line, and a
 * clay coffee mug whose steam is the thing you watch while the app catches up.
 */
export function LoadingPage({ label }: LoadingPageProps) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const resolvedLabel = label ?? t('components.loadingPageDefault');
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((reduceMotion) => {
        if (reduceMotion) setAnimate(false);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduceMotion) => {
      setAnimate(!reduceMotion);
    });
    return () => subscription.remove();
  }, []);

  return (
    <Screen>
      <View
        style={styles.center}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={resolvedLabel}
        accessibilityState={{ busy: true }}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.stack, { gap: spacing.lg }]}
        >
          <View style={[styles.lockup, { gap: spacing.md }]}>
            <Mug animate={animate} />
            <View style={styles.wordmark}>
              <Text variant="h3">{t('common.brandTrade')}</Text>
              <Text variant="h3" color={colors.accent}>
                {t('common.brandReport')}
              </Text>
            </View>
          </View>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {resolvedLabel}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function Mug({ animate }: { animate: boolean }) {
  const bob = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      bob.value = 0;
      return;
    }
    bob.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [animate, bob]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(bob.value, [0, 1], [0, -6]) }],
  }));

  return (
    <Animated.View style={style}>
      <Image source={MUG} contentFit="contain" accessible={false} style={styles.mug} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: {
    alignItems: 'center',
  },
  lockup: {
    alignItems: 'center',
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mug: {
    width: MUG_WIDTH,
    height: MUG_HEIGHT,
  },
});

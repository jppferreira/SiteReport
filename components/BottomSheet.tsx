import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal as RNModal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const OPEN_MS = 240;
const CLOSE_MS = 200;
const DISMISS_Y = 80;

/**
 * Bottom sheet with RN Animated only — no Reanimated / Worklets.
 * Avoids "Tried to synchronously call a remote function" on Expo Go.
 */
export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const { colors, radius, spacing, shadows } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [translateY] = useState(() => new Animated.Value(400));
  const [backdropOpacity] = useState(() => new Animated.Value(0));
  const [dragStart] = useState({ y: 0 });
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const finishClose = () => {
    closingRef.current = false;
    onCloseRef.current();
  };

  const animateOpen = () => {
    closingRef.current = false;
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: OPEN_MS, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: OPEN_MS, useNativeDriver: true }),
    ]).start();
  };

  const animateClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(translateY, { toValue: 400, duration: CLOSE_MS, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: CLOSE_MS, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) finishClose();
      else closingRef.current = false;
    });
  };

  useEffect(() => {
    if (visible) {
      translateY.setValue(400);
      backdropOpacity.setValue(0);
      animateOpen();
    } else {
      closingRef.current = false;
    }
    // Only react to visibility changes; anim helpers close over stable Animated values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          translateY.stopAnimation((value) => {
            dragStart.y = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          const next = Math.max(0, dragStart.y + gesture.dy);
          translateY.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > DISMISS_Y || gesture.vy > 1.2) {
            animateClose();
            return;
          }
          Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }).start();
        },
      }),
    // translateY / animateClose / dragStart are stable for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  if (!visible) return null;

  return (
    <RNModal visible transparent animationType="none" onRequestClose={animateClose} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.container}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingBottom: insets.bottom + spacing.lg,
              paddingTop: spacing.sm,
              paddingHorizontal: spacing.lg,
              transform: [{ translateY }],
            },
            shadows.overlay,
          ]}
          {...panResponder.panHandlers}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          {children}
        </Animated.View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
});

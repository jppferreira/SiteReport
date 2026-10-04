import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { Text } from './Text';

export type ToastTone = 'neutral' | 'success' | 'warning' | 'destructive';

type ToastOptions = {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors, radius, spacing, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<ToastOptions | null>(null);
  const translateY = useSharedValue(40);
  const opacity = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    translateY.value = withTiming(40, { duration: 180 });
    opacity.value = withTiming(0, { duration: 180 });
    setTimeout(() => setCurrent(null), 180);
  }, [translateY, opacity]);

  const showToast = useCallback(
    (options: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      setCurrent(options);
      translateY.value = 40;
      opacity.value = 0;
      requestAnimationFrame(() => {
        translateY.value = withTiming(0, { duration: 220 });
        opacity.value = withTiming(1, { duration: 220 });
      });
      timer.current = setTimeout(() => hide(), options.durationMs ?? 3200);
    },
    [translateY, opacity, hide]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const palette = current ? getPalette(current.tone ?? 'neutral', colors) : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {current ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.container,
            { bottom: insets.bottom + 90 },
            animatedStyle,
          ]}
        >
          <View
            style={[
              styles.toast,
              { backgroundColor: palette!.bg, borderRadius: radius.md, paddingHorizontal: spacing.md },
              shadows.floating,
            ]}
          >
            {palette!.icon ? <Ionicons name={palette!.icon} size={18} color={palette!.fg} /> : null}
            <Text variant="bodySmall" color={palette!.fg} style={{ flex: 1 }}>
              {current.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

function getPalette(tone: ToastTone, colors: ReturnType<typeof useTheme>['colors']) {
  switch (tone) {
    case 'success':
      return { bg: colors.ctaDark, fg: colors.textInverse, icon: 'checkmark-circle' as const };
    case 'warning':
      return { bg: colors.ctaDark, fg: colors.textInverse, icon: 'warning' as const };
    case 'destructive':
      return { bg: colors.destructive, fg: colors.textInverse, icon: 'alert-circle' as const };
    default:
      return { bg: colors.ctaDark, fg: colors.textInverse, icon: null };
  }
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    width: '100%',
  },
});

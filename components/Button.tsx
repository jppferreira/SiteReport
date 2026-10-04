import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  accessibilityHint?: string;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = true,
  icon,
  style,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.97, { duration: 100 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 150 });
  }, [scale]);

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [isDisabled, onPress]);

  const palette = getPalette(variant, colors);

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        accessibilityHint={accessibilityHint}
        testID={testID}
        style={[
          styles.base,
          {
            backgroundColor: isDisabled ? palette.disabledBg : palette.bg,
            borderColor: palette.border,
            borderWidth: palette.border ? 1 : 0,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.md,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : (
          <>
            {icon}
            <Text variant="button" color={isDisabled ? palette.disabledFg : palette.fg}>
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

type ButtonPalette = {
  bg: string;
  fg: string;
  border: string | undefined;
  disabledBg: string;
  disabledFg: string;
};

function getPalette(variant: ButtonVariant, colors: ReturnType<typeof useTheme>['colors']): ButtonPalette {
  switch (variant) {
    case 'primary':
      return {
        bg: colors.ctaDark,
        fg: colors.textInverse,
        border: undefined,
        disabledBg: colors.borderStrong,
        disabledFg: colors.textTertiary,
      };
    case 'secondary':
      return {
        bg: colors.surface,
        fg: colors.textPrimary,
        border: colors.border,
        disabledBg: colors.surfaceSunken,
        disabledFg: colors.textTertiary,
      };
    case 'tertiary':
      return {
        bg: 'transparent',
        fg: colors.textPrimary,
        border: undefined,
        disabledBg: 'transparent',
        disabledFg: colors.textTertiary,
      };
    case 'destructive':
      return {
        bg: colors.destructive,
        fg: colors.textInverse,
        border: undefined,
        disabledBg: colors.borderStrong,
        disabledFg: colors.textTertiary,
      };
    default:
      return {
        bg: colors.ctaDark,
        fg: colors.textInverse,
        border: undefined,
        disabledBg: colors.borderStrong,
        disabledFg: colors.textTertiary,
      };
  }
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  base: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

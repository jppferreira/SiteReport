import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type IconButtonProps = {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'default' | 'filled' | 'ghost';
  size?: number;
  color?: string;
  style?: ViewStyle;
  disabled?: boolean;
};

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  variant = 'default',
  size = 22,
  color,
  style,
  disabled = false,
}: IconButtonProps) {
  const { colors, radius } = useTheme();

  const backgroundColor =
    variant === 'filled' ? colors.surfaceSunken : variant === 'ghost' ? 'transparent' : colors.surface;
  const borderColor = variant === 'default' ? colors.border : 'transparent';

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor,
          borderWidth: variant === 'default' ? 1 : 0,
          borderRadius: radius.pill,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={color ?? colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

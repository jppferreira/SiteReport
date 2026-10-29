import React from 'react';
import { Pressable } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

type TextButtonProps = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  align?: 'left' | 'center';
  tone?: 'default' | 'accent';
};

export function TextButton({
  label,
  onPress,
  destructive = false,
  disabled = false,
  align = 'center',
  tone = 'default',
}: TextButtonProps) {
  const { colors } = useTheme();
  const color = disabled
    ? colors.textTertiary
    : destructive
      ? colors.destructive
      : tone === 'accent'
        ? colors.accent
        : colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        paddingVertical: 10,
        alignItems: align === 'center' ? 'center' : 'flex-start',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text variant="bodyMedium" color={color}>
        {label}
      </Text>
    </Pressable>
  );
}

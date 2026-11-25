import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { Text } from './Text';

type FloatingActionButtonProps = {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** When set, renders the Figma-style pill FAB (+ New) instead of a round icon-only button. */
  label?: string;
  accessibilityLabel: string;
};

export function FloatingActionButton({
  onPress,
  icon = 'add',
  label,
  accessibilityLabel,
}: FloatingActionButtonProps) {
  const { colors, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const withLabel = Boolean(label);

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        withLabel ? styles.pill : styles.base,
        {
          bottom: insets.bottom + 84,
          backgroundColor: colors.ctaDark,
          borderRadius: radius.pill,
          opacity: pressed ? 0.9 : 1,
        },
        shadows.floating,
      ]}
    >
      <Ionicons name={icon} size={withLabel ? 20 : 26} color={colors.textInverse} />
      {label ? (
        <Text variant="bodyMedium" color={colors.textInverse} style={styles.label}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    right: 20,
    height: 56,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontFamily: 'Lexend_600SemiBold',
    fontSize: 16,
  },
});

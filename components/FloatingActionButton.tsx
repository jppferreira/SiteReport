import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type FloatingActionButtonProps = {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
};

export function FloatingActionButton({ onPress, icon = 'add', accessibilityLabel }: FloatingActionButtonProps) {
  const { colors, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.base,
        {
          bottom: insets.bottom + 84,
          backgroundColor: colors.ctaDark,
          borderRadius: radius.pill,
          opacity: pressed ? 0.9 : 1,
        },
        shadows.floating,
      ]}
    >
      <Ionicons name={icon} size={26} color={colors.textInverse} />
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
});

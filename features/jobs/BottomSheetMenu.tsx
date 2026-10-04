import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet, Text } from '@/components';
import { useTheme } from '@/theme';

export type BottomSheetMenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type BottomSheetMenuProps = {
  visible: boolean;
  onClose: () => void;
  items: BottomSheetMenuItem[];
};

export function BottomSheetMenu({ visible, onClose, items }: BottomSheetMenuProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ gap: spacing.xs }}>
        {items.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => {
              onClose();
              item.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: colors.surfaceSunken, borderRadius: radius.md, paddingHorizontal: spacing.md, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={item.destructive ? colors.destructive : colors.textPrimary}
              style={{ marginRight: spacing.sm }}
            />
            <Text variant="bodyMedium" color={item.destructive ? colors.destructive : colors.textPrimary}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
  },
});

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

type SettingRowProps = {
  label: string;
  value?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
};

export function SettingRow({ label, value, icon, onPress, destructive = false, showChevron = true }: SettingRowProps) {
  const { colors, spacing } = useTheme();
  const labelColor = destructive ? colors.destructive : colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [
        styles.row,
        { paddingVertical: spacing.sm, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={styles.left}>
        {icon ? <Ionicons name={icon} size={20} color={labelColor} style={{ marginRight: spacing.sm }} /> : null}
        <Text variant="body" color={labelColor}>
          {label}
        </Text>
      </View>
      <View style={styles.right}>
        {value ? (
          <Text variant="body" color={colors.textSecondary} numberOfLines={1} style={{ maxWidth: 160 }}>
            {value}
          </Text>
        ) : null}
        {onPress && showChevron ? (
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={{ marginLeft: 6 }} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

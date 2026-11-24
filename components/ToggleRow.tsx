import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

type ToggleRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Use on dark surfaces (e.g. photo detail) so labels stay readable. */
  onDark?: boolean;
};

export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  onDark = false,
}: ToggleRowProps) {
  const { colors, spacing } = useTheme();
  const labelColor = onDark
    ? disabled
      ? 'rgba(255,255,255,0.4)'
      : '#FFFFFF'
    : disabled
      ? colors.textTertiary
      : colors.textPrimary;
  const descriptionColor = onDark ? 'rgba(255,255,255,0.65)' : colors.textSecondary;

  return (
    <View style={[styles.row, { paddingVertical: spacing.sm }]}>
      <View style={styles.textColumn}>
        <Text variant="body" color={labelColor}>
          {label}
        </Text>
        {description ? (
          <Text variant="bodySmall" color={descriptionColor} style={{ marginTop: 2 }}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: onDark ? 'rgba(255,255,255,0.22)' : colors.border,
          true: colors.accent,
        }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  textColumn: {
    flex: 1,
    marginRight: 12,
  },
});

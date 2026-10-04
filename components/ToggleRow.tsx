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
};

export function ToggleRow({ label, description, value, onValueChange, disabled = false }: ToggleRowProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.row, { paddingVertical: spacing.sm }]}>
      <View style={styles.textColumn}>
        <Text variant="body" color={disabled ? colors.textTertiary : colors.textPrimary}>
          {label}
        </Text>
        {description ? (
          <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label}
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

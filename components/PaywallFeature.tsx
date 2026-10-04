import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

type PaywallFeatureProps = {
  label: string;
};

export function PaywallFeature({ label }: PaywallFeatureProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.row, { marginBottom: spacing.sm }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name="checkmark" size={14} color={colors.accentPressed} />
      </View>
      <Text variant="body" style={{ flex: 1 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

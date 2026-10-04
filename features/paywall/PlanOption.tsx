import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { StatusBadge, Text } from '@/components';
import { ProductInfo } from '@/models';
import { useTheme } from '@/theme';

type PlanOptionProps = {
  product: ProductInfo;
  selected: boolean;
  onSelect: () => void;
  badge?: string;
};

export function PlanOption({ product, selected, onSelect, badge }: PlanOptionProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${planLabel(product.planId)}, ${product.priceFormatted} ${product.periodLabel}`}
      style={[
        styles.container,
        {
          borderRadius: radius.lg,
          borderColor: selected ? colors.ctaDark : colors.border,
          borderWidth: selected ? 2 : 1,
          backgroundColor: colors.surface,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.radio, { borderColor: selected ? colors.ctaDark : colors.borderStrong }]}>
          {selected ? <View style={[styles.radioDot, { backgroundColor: colors.ctaDark }]} /> : null}
        </View>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <View style={styles.titleRow}>
            <Text variant="bodyMedium">{planLabel(product.planId)}</Text>
            {badge ? <StatusBadge label={badge} tone="accent" /> : null}
          </View>
          <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
            {product.priceFormatted} {product.periodLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function planLabel(planId: ProductInfo['planId']): string {
  if (planId === 'monthly') return 'Monthly';
  if (planId === 'annual') return 'Yearly';
  return 'Lifetime';
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

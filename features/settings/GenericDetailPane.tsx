import React from 'react';
import { View, StyleSheet } from 'react-native';

import { Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { SettingsDetailPane } from './SettingsDetailPanes';

type GenericDetailPaneProps = {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: string }>;
  fullScreenHref: string;
};

/**
 * Generic detail pane for settings sections that show key-value pairs.
 */
export function GenericDetailPane({ title, subtitle, items, fullScreenHref }: GenericDetailPaneProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <SettingsDetailPane title={title} subtitle={subtitle} fullScreenHref={fullScreenHref}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: spacing.md,
            gap: spacing.sm,
          },
        ]}
      >
        {items.map((item, index) => (
          <View key={index} style={styles.row}>
            <Text variant="label" color={colors.textSecondary}>
              {item.label}
            </Text>
            <Text variant="body">{item.value}</Text>
          </View>
        ))}
      </View>
    </SettingsDetailPane>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  row: {
    gap: 4,
  },
});

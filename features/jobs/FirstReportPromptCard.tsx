import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

type FirstReportPromptCardProps = {
  onPress: () => void;
};

/** Empty-list CTA: same footprint as a job card, for fresh installs with no jobs yet. */
export function FirstReportPromptCard({ onPress }: FirstReportPromptCardProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: colors.accentSoft,
              borderRadius: radius.md,
              marginRight: spacing.md,
            },
          ]}
        >
          <Ionicons name="add" size={28} color={colors.accent} />
        </View>

        <View style={styles.content}>
          <Text variant="h3" numberOfLines={2}>
            {t('jobs.emptyTitle')}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 4 }}>
            {t('jobs.emptyDescription')}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingRight: 8,
  },
});

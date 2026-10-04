import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, StatusBadge, Text } from '@/components';
import { Report } from '@/models';
import { useTheme } from '@/theme';
import { formatFileSize, formatRelativeDate } from '@/utils/format';

type ReportListItemProps = {
  report: Report;
  jobTitle: string;
  isStale: boolean;
  onPress: () => void;
};

export function ReportListItem({ report, jobTitle, isStale, onPress }: ReportListItemProps) {
  const { colors, spacing } = useTheme();

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {report.fileName}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={1} style={{ marginTop: 2 }}>
            {jobTitle}
          </Text>
          <View style={[styles.metaRow, { marginTop: spacing.xs }]}>
            <Text variant="caption" color={colors.textTertiary}>
              {formatRelativeDate(report.generatedAt)}
            </Text>
            <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
            <Text variant="caption" color={colors.textTertiary}>
              {formatFileSize(report.fileSize)}
            </Text>
          </View>
        </View>
        {isStale ? <StatusBadge label="OUTDATED" tone="warning" /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
});

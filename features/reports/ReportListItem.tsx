import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, LocalImage, StatusBadge, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { Report } from '@/models';
import { useTheme } from '@/theme';
import { formatFileSize, formatRelativeDate } from '@/utils/format';

type ReportListItemProps = {
  report: Report;
  jobTitle: string;
  isStale: boolean;
  /** When set, a thumbnail of the finished job sits on the left. */
  coverUri?: string | null;
  onPress: () => void;
};

export function ReportListItem({ report, jobTitle, isStale, coverUri, onPress }: ReportListItemProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View
          style={[
            styles.thumb,
            { backgroundColor: colors.surfaceSunken, borderRadius: radius.md, marginRight: spacing.md },
          ]}
        >
          {coverUri ? (
            <LocalImage uri={coverUri} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Ionicons name="image-outline" size={22} color={colors.textTertiary} />
          )}
        </View>

        <View style={styles.content}>
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

        {report.status !== 'active' || isStale ? (
          <View style={styles.badges}>
            {report.status === 'draft' ? <StatusBadge label={t('reports.statusDraft')} tone="warning" /> : null}
            {report.status === 'archived' ? <StatusBadge label={t('reports.statusArchived')} /> : null}
            {isStale ? <StatusBadge label={t('reports.listItemOutdated')} tone="warning" /> : null}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  thumb: {
    width: 72,
    height: 72,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, minWidth: 0 },
  badges: { alignItems: 'flex-end', gap: 6, marginLeft: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
});

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, LocalImage, StatusBadge, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { Report } from '@/models';
import { useTheme } from '@/theme';
import { formatFileSize, formatRelativeDate } from '@/utils/format';

const COVER_HEIGHT = 200;

type ReportListItemProps = {
  report: Report;
  jobTitle: string;
  isStale: boolean;
  /** When set, the card leads with a photo of the finished job. */
  coverUri?: string | null;
  featured?: boolean;
  onPress: () => void;
};

export function ReportListItem({ report, jobTitle, isStale, coverUri, featured = false, onPress }: ReportListItemProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();

  return (
    <Card onPress={onPress} padded={!featured} style={styles.card}>
      {featured ? (
        <View style={[styles.cover, { padding: spacing.xs }]}>
          <View
            style={[
              styles.coverFrame,
              { backgroundColor: colors.surfaceSunken, borderRadius: radius.xl },
            ]}
          >
            {coverUri ? (
              <LocalImage
                uri={coverUri}
                style={[StyleSheet.absoluteFill, { borderRadius: radius.xl }]}
                contentFit="cover"
              />
            ) : (
              <Ionicons name="image-outline" size={28} color={colors.textTertiary} />
            )}
          </View>
        </View>
      ) : null}
      <View style={[styles.row, featured && { padding: spacing.md }]}>
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
        {isStale ? <StatusBadge label={t('reports.listItemOutdated')} tone="warning" /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  cover: {
    width: '100%',
    height: COVER_HEIGHT,
  },
  coverFrame: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
});

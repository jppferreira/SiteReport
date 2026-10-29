import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, LocalImage, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { Job } from '@/models';
import { useTheme } from '@/theme';
import { formatDate } from '@/utils/format';

type JobCardProps = {
  job: Job;
  photoCount: number;
  thumbnailUri: string | null;
  onPress: () => void;
};

export function JobCard({ job, photoCount, thumbnailUri, onPress }: JobCardProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const subtitle = job.address || job.customerName;
  const photoLabel =
    photoCount > 0
      ? `  ·  ${t('jobs.photoCount', {
          count: photoCount,
          unit: photoCount === 1 ? t('common.photo') : t('common.photos'),
        })}`
      : '';

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View
          style={[
            styles.thumb,
            { backgroundColor: colors.surfaceSunken, borderRadius: radius.md, marginRight: spacing.md },
          ]}
        >
          {thumbnailUri ? (
            <LocalImage uri={thumbnailUri} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Ionicons name="image-outline" size={22} color={colors.textTertiary} />
          )}
        </View>

        <View style={styles.content}>
          <Text variant="h3" numberOfLines={1}>
            {job.title}
          </Text>

          {subtitle ? (
            <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={1} style={{ marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}

          <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.xs }}>
            {formatDate(job.jobDate)}
            {photoLabel}
          </Text>
        </View>
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
  thumb: {
    width: 72,
    height: 72,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
});

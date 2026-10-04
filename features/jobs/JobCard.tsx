import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, StatusBadge, Text } from '@/components';
import { Job } from '@/models';
import { useTheme } from '@/theme';
import { formatRelativeDate, pluralize } from '@/utils/format';

type JobCardProps = {
  job: Job;
  photoCount: number;
  thumbnailUri: string | null;
  onPress: () => void;
};

export function JobCard({ job, photoCount, thumbnailUri, onPress }: JobCardProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View
          style={[
            styles.thumb,
            { backgroundColor: colors.surfaceSunken, borderRadius: radius.md, marginRight: spacing.sm },
          ]}
        >
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={styles.thumbPlaceholder} />
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text variant="h3" numberOfLines={1} style={{ flex: 1 }}>
              {job.title}
            </Text>
            <StatusBadge label={statusLabel(job.status)} tone={statusTone(job.status)} />
          </View>

          {job.customerName ? (
            <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={1} style={{ marginTop: 2 }}>
              {job.customerName}
            </Text>
          ) : null}

          <View style={[styles.metaRow, { marginTop: spacing.xs }]}>
            <Text variant="caption" color={colors.textTertiary}>
              {formatRelativeDate(job.jobDate)}
            </Text>
            {photoCount > 0 ? (
              <>
                <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
                <Text variant="caption" color={colors.textTertiary}>
                  {photoCount} {pluralize(photoCount, 'photo')}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

function statusLabel(status: Job['status']): string {
  if (status === 'complete') return 'COMPLETE';
  if (status === 'in_progress') return 'IN PROGRESS';
  return 'DRAFT';
}

function statusTone(status: Job['status']): 'success' | 'accent' | 'neutral' {
  if (status === 'complete') return 'success';
  if (status === 'in_progress') return 'accent';
  return 'neutral';
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  thumb: {
    width: 56,
    height: 56,
    overflow: 'hidden',
  },
  thumbPlaceholder: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});

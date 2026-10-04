import { Image, Pressable, StyleSheet, View } from 'react-native';

import type { Job, Photo, Report } from '@/models/domain';
import { colors, radius, shadows, spacing } from '@/theme';
import { formatJobDate } from '@/utils/date';
import { AppText } from '@/components/core/AppText';
import { Card } from '@/components/core/Card';
import { StatusBadge } from '@/components/core/StatusBadge';

type Props = {
  job: Job;
  coverPhoto: Photo | null;
  reports: Report[];
  onPress: () => void;
};

export function JobCard({ job, coverPhoto, reports, onPress }: Props) {
  const reportState = reports[0]?.status ?? 'stale';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [pressed ? styles.pressed : null]}>
      <Card style={styles.card}>
        {coverPhoto ? <Image source={{ uri: coverPhoto.thumbnailUri ?? coverPhoto.localUri }} style={styles.image} /> : null}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <AppText variant="h3" numberOfLines={1}>
              {job.title}
            </AppText>
            <StatusBadge status={job.status} />
          </View>
          <AppText variant="bodySmall" color={colors.textSecondary} numberOfLines={1}>
            {job.customerName || 'No customer added'}
          </AppText>
          <View style={styles.metaRow}>
            <AppText variant="caption" color={colors.textSecondary}>
              {formatJobDate(job.jobDate)}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {reports.length} report{reports.length === 1 ? '' : 's'}
            </AppText>
            {reports.length > 0 ? <StatusBadge status={reportState} /> : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    padding: 0,
    ...shadows.subtle,
  },
  image: {
    width: '100%',
    height: 126,
    backgroundColor: colors.skeleton,
  },
  content: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  pressed: {
    opacity: 0.87,
    borderRadius: radius.large,
  },
});

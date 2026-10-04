import { StyleSheet, View } from 'react-native';

import type { SectionStatus } from '@/models/domain';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

type Props = {
  status: SectionStatus | 'draft' | 'complete' | 'current' | 'stale';
};

const mapLabel: Record<Props['status'], string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
  draft: 'Draft',
  current: 'Current',
  stale: 'Needs update',
};

const mapColor: Record<Props['status'], string> = {
  not_started: colors.textSecondary,
  in_progress: colors.warning,
  complete: colors.success,
  draft: colors.textSecondary,
  current: colors.success,
  stale: colors.warning,
};

export function StatusBadge({ status }: Props) {
  const color = mapColor[status];
  return (
    <View style={[styles.badge, { borderColor: `${color}55`, backgroundColor: `${color}14` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="caption" color={color}>
        {mapLabel[status]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
});

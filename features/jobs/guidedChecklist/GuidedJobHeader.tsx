import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { useTheme } from '@/theme';

import { ProgressRing } from './ProgressRing';

type GuidedJobHeaderProps = {
  title: string;
  address: string | null;
  dateLabel: string;
  completed: number;
  total: number;
  intro: string | null;
};

export function GuidedJobHeader({
  title,
  address,
  dateLabel,
  completed,
  total,
  intro,
}: GuidedJobHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <View style={styles.titleBlock}>
          <Text
            variant="h1"
            style={{ fontSize: 28, lineHeight: 34, fontFamily: 'Lexend_700Bold', letterSpacing: -0.28 }}
            numberOfLines={2}
          >
            {title}
          </Text>
          <View style={styles.meta}>
            {address ? (
              <>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text variant="caption" color={colors.textSecondary} style={styles.metaText} numberOfLines={1}>
                  {address}
                </Text>
              </>
            ) : null}
            {address && dateLabel ? (
              <Text variant="caption" color={colors.textTertiary} style={styles.metaText}>
                ·
              </Text>
            ) : null}
            {dateLabel ? (
              <>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text variant="caption" color={colors.textSecondary} style={styles.metaText}>
                  {dateLabel}
                </Text>
              </>
            ) : null}
          </View>
        </View>
        <ProgressRing completed={completed} total={total} />
      </View>

      {intro ? (
        <View style={[styles.intro, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="sparkles" size={16} color={colors.accentPressed} />
          <Text
            variant="caption"
            color={colors.accentPressed}
            style={{ flex: 1, fontSize: 12, lineHeight: 17, fontFamily: 'Lexend_400Regular' }}
          >
            {intro}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: 'Lexend_400Regular',
    letterSpacing: 0,
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
});

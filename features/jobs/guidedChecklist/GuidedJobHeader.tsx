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
  /** Customer name shown as “Name · address” when set (Figma Documents redesign). */
  customerName?: string | null;
  /** When true, matches Figma J1: status chips, no progress ring / intro callout. */
  documentsLayout?: boolean;
  statusLabel?: string;
};

export function GuidedJobHeader({
  title,
  address,
  dateLabel,
  completed,
  total,
  intro,
  customerName,
  documentsLayout = false,
  statusLabel,
}: GuidedJobHeaderProps) {
  const { colors } = useTheme();

  const subtitle = [customerName?.trim(), address?.trim()].filter(Boolean).join(' · ');

  if (documentsLayout) {
    return (
      <View style={styles.wrap}>
        <Text
          variant="h1"
          style={{ fontSize: 26, lineHeight: 32, fontFamily: 'Lexend_600SemiBold', letterSpacing: -0.4 }}
          numberOfLines={2}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 6 }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.chips}>
          {statusLabel ? (
            <View style={[styles.chip, { backgroundColor: colors.ctaDark }]}>
              <Text variant="caption" color={colors.textInverse} style={styles.chipLabel}>
                {statusLabel}
              </Text>
            </View>
          ) : null}
          {dateLabel ? (
            <View style={[styles.chip, { backgroundColor: colors.surfaceSunken }]}>
              <Text variant="caption" color={colors.textSecondary} style={styles.chipLabelMuted}>
                {dateLabel.startsWith('Started') ? dateLabel : `Started ${dateLabel}`}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

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
  wrap: { gap: 10 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleBlock: { flex: 1, minWidth: 0, gap: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaText: { flexShrink: 1 },
  intro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: {
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: { fontFamily: 'Lexend_600SemiBold', fontSize: 12 },
  chipLabelMuted: { fontFamily: 'Lexend_500Medium', fontSize: 12 },
});

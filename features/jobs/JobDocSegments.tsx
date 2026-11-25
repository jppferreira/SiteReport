import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import type { JobsDocKindFilter } from '@/hooks/useJobs';
import { useI18n } from '@/i18n/useI18n';
import type { DocumentKind } from '@/models';
import { useTheme } from '@/theme';

const SEGMENTS: DocumentKind[] = ['quote', 'report', 'invoice'];

type JobDocSegmentsProps = {
  value: JobsDocKindFilter;
  onChange: (value: JobsDocKindFilter) => void;
  presence: Record<DocumentKind, boolean>;
};

export function JobDocSegments({ value, onChange, presence }: JobDocSegmentsProps) {
  const { colors, radius, shadows } = useTheme();
  const { t } = useI18n();

  const labels: Record<DocumentKind, string> = {
    quote: t('jobs.segmentQuote'),
    report: t('jobs.segmentReport'),
    invoice: t('jobs.segmentInvoice'),
  };

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: colors.surfaceSunken, borderRadius: radius.pill },
      ]}
    >
      {SEGMENTS.map((kind) => {
        const active = value === kind;
        const hasDocs = presence[kind];
        return (
          <Pressable
            key={kind}
            onPress={() => onChange(kind)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={labels[kind]}
            style={[
              styles.segment,
              {
                borderRadius: radius.pill,
                backgroundColor: active ? colors.surface : 'transparent',
              },
              active ? shadows.subtle : null,
            ]}
          >
            {hasDocs ? (
              <View style={[styles.tick, { backgroundColor: colors.accent, borderRadius: 7 }]}>
                <Ionicons name="checkmark" size={10} color={colors.accentOnAccent} />
              </View>
            ) : (
              <View style={[styles.emptyDot, { borderColor: colors.textTertiary }]} />
            )}
            <Text
              variant="bodySmall"
              color={active ? colors.textPrimary : colors.textSecondary}
              style={active ? styles.activeLabel : undefined}
            >
              {labels[kind]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 4,
  },
  segment: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tick: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  activeLabel: {
    fontFamily: 'Lexend_600SemiBold',
  },
});

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

type GuidedFooterProps = {
  primaryLabel: string;
  primaryIcon?: keyof typeof Ionicons.glyphMap;
  onPrimary: () => void;
  /** Empty-state saved note under the CTA. */
  showSavedNote?: boolean;
  onSavedNotePress?: () => void;
  /** In-progress preview row. */
  showPreviewRow?: boolean;
  previewPagesLabel?: string | null;
  unlockHint?: string | null;
  onPreview?: () => void;
  canCreatePdf?: boolean;
};

export function GuidedFooter({
  primaryLabel,
  primaryIcon,
  onPrimary,
  showSavedNote = false,
  onSavedNotePress,
  showPreviewRow = false,
  previewPagesLabel,
  unlockHint,
  onPreview,
  canCreatePdf = false,
}: GuidedFooterProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {showPreviewRow ? (
        <View style={styles.previewRow}>
          <Pressable onPress={onPreview} style={styles.previewLink} disabled={!onPreview}>
            <Ionicons name="eye-outline" size={16} color={colors.textPrimary} />
            <Text variant="bodySmall" style={styles.previewLabel}>
              {t('jobDetail.guided.previewPdf')}
            </Text>
            {previewPagesLabel ? (
              <View style={[styles.pagesChip, { backgroundColor: colors.surfaceSunken }]}>
                <Text variant="caption" color={colors.textSecondary} style={styles.pagesLabel}>
                  {previewPagesLabel}
                </Text>
              </View>
            ) : null}
          </Pressable>
          {!canCreatePdf && unlockHint ? (
            <View style={styles.unlock}>
              <Ionicons name="lock-closed" size={12} color={colors.textTertiary} />
              <Text variant="caption" color={colors.textTertiary} style={styles.unlockLabel}>
                {unlockHint}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Pressable
        onPress={onPrimary}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: colors.ctaDark, opacity: pressed ? 0.92 : 1 },
        ]}
      >
        {primaryIcon ? <Ionicons name={primaryIcon} size={18} color={colors.textInverse} /> : null}
        <Text variant="button" color={colors.textInverse} style={styles.primaryLabel}>
          {primaryLabel}
        </Text>
        {!primaryIcon ? <Ionicons name="arrow-forward" size={18} color={colors.textInverse} /> : null}
      </Pressable>

      {showSavedNote ? (
        <Pressable onPress={onSavedNotePress} style={styles.savedNote}>
          <Ionicons name="shield-checkmark-outline" size={13} color={colors.textTertiary} />
          <Text variant="caption" color={colors.textTertiary} style={styles.savedLabel}>
            {t('jobDetail.guided.savedNote')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  previewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  previewLabel: {
    fontSize: 13,
    fontFamily: fontFamily.semibold,
  },
  pagesChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pagesLabel: {
    fontSize: 10,
    fontFamily: fontFamily.medium,
    letterSpacing: 0,
  },
  unlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  unlockLabel: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    letterSpacing: 0,
  },
  primary: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryLabel: {
    fontSize: 15,
  },
  savedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  savedLabel: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    letterSpacing: 0,
  },
});

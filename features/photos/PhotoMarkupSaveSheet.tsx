import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BottomSheet, Text, ToggleRow } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { captionFromAnnotations, hasAnnotations, PhotoAnnotations, PhotoType } from '@/models';
import { useTheme } from '@/theme';

import { PhotoAnnotationShapes } from './PhotoAnnotationShapes';

type PhotoMarkupSaveSheetProps = {
  visible: boolean;
  onClose: () => void;
  uri: string;
  photoWidth: number;
  photoHeight: number;
  annotations: PhotoAnnotations;
  caption: string;
  onCaptionChange: (value: string) => void;
  stageLabel: string;
  sectionLabel: string;
  jobSubtitle?: string | null;
  stampEnabled: boolean;
  onStampChange: (value: boolean) => void;
  stampSample?: string | null;
  saving?: boolean;
  onSave: () => void;
};

/**
 * Save sheet from Figma redesign 11 — caption, section, evidence stamp, then Save.
 * Caption prints under the photo; marks are already baked into the PDF SVG.
 */
export function PhotoMarkupSaveSheet({
  visible,
  onClose,
  uri,
  photoWidth,
  photoHeight,
  annotations,
  caption,
  onCaptionChange,
  stageLabel,
  sectionLabel,
  jobSubtitle,
  stampEnabled,
  onStampChange,
  stampSample,
  saving = false,
  onSave,
}: PhotoMarkupSaveSheetProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const markCount = annotations.shapes.length;
  const suggested = useMemo(() => captionFromAnnotations(annotations), [annotations]);

  const [thumb] = useState({ width: 92, height: 69 });

  return (
    <BottomSheet visible={visible} onClose={onClose} dragHandleOnly>
      <View style={styles.head}>
        <Text variant="h3">{t('photoAnnotate.saveSheetTitle')}</Text>
        {jobSubtitle ? (
          <Text variant="caption" color={colors.textSecondary}>
            {jobSubtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.previewRow}>
        <View style={[styles.thumb, { width: thumb.width, height: thumb.height }]}>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          {hasAnnotations(annotations) && photoWidth > 0 && photoHeight > 0 ? (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <PhotoAnnotationShapes annotations={annotations} width={thumb.width} height={thumb.height} />
            </View>
          ) : null}
        </View>
        <View style={styles.previewMeta}>
          <Text variant="body" color={colors.textPrimary}>
            {stageLabel}
          </Text>
          <View style={styles.marksBadge}>
            <Text variant="caption" color={colors.textSecondary}>
              {markCount === 1
                ? t('photoAnnotate.marksCountOne')
                : t('photoAnnotate.marksCount', { count: markCount })}
            </Text>
          </View>
        </View>
      </View>

      <Text variant="caption" color={colors.textSecondary} style={styles.fieldLabel}>
        {t('photoAnnotate.saveSheetCaption')}
      </Text>
      <TextInput
        value={caption}
        onChangeText={onCaptionChange}
        placeholder={suggested || t('photoAnnotate.captionPlaceholder')}
        placeholderTextColor={colors.textTertiary}
        style={[styles.captionInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
      />

      <View style={[styles.sectionRow, { borderColor: colors.border }]}>
        <Text variant="body" color={colors.textPrimary}>
          {t('photoAnnotate.saveSheetSection')}
        </Text>
        <Text variant="body" color={colors.textSecondary}>
          {sectionLabel}
        </Text>
      </View>

      <View style={styles.stampBlock}>
        <ToggleRow
          label={t('photoAnnotate.saveSheetStamp')}
          value={stampEnabled}
          onValueChange={onStampChange}
        />
        {stampSample ? (
          <View style={styles.stampSample}>
            <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {stampSample}
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={saving}
        onPress={onSave}
        style={[styles.saveBtn, { backgroundColor: colors.accent, opacity: saving ? 0.7 : 1 }]}
      >
        <Text variant="label" color={colors.accentOnAccent}>
          {t('photoAnnotate.saveSheetAction')}
        </Text>
      </Pressable>
    </BottomSheet>
  );
}

export function stageLabelForType(type: PhotoType, t: (key: string) => string): string {
  if (type === 'before') return t('photos.stageBefore');
  if (type === 'during') return t('photos.stageDuring');
  return t('photos.stageAfter');
}

const styles = StyleSheet.create({
  head: { gap: 4, marginBottom: 16 },
  previewRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 18 },
  thumb: { borderRadius: 10, overflow: 'hidden', backgroundColor: '#E9EDEA' },
  previewMeta: { gap: 6 },
  marksBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#F2F4F2',
  },
  fieldLabel: { marginBottom: 6 },
  captionInput: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  stampBlock: { marginBottom: 16 },
  stampSample: {
    marginTop: -4,
    marginBottom: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F2F4F2',
  },
  saveBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
});

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BottomSheet, LocalImage, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { hasAnnotations, listCallouts, Photo, PhotoBrowseLayout } from '@/models';
import { useTheme } from '@/theme';

import { PhotoAnnotationShapes } from './PhotoAnnotationShapes';

type PhotoCardProps = {
  photo: Photo;
  onPress: () => void;
  onLongPress?: () => void;
  /** Compact thumbnails in a grid, or full-width cards with notes underneath. */
  layout?: PhotoBrowseLayout;
  /** Shows a light drag affordance; arrows are replaced by drag-to-reorder. */
  reorderMode?: boolean;
};

export function PhotoCard({
  photo,
  onPress,
  onLongPress,
  layout = 'compact',
  reorderMode = false,
}: PhotoCardProps) {
  if (layout === 'fullWidth') {
    return (
      <FullWidthPhotoCard
        photo={photo}
        onPress={onPress}
        onLongPress={onLongPress}
        reorderMode={reorderMode}
      />
    );
  }

  return (
    <CompactPhotoCard
      photo={photo}
      onPress={onPress}
      onLongPress={onLongPress}
      reorderMode={reorderMode}
    />
  );
}

function CompactPhotoCard({
  photo,
  onPress,
  onLongPress,
  reorderMode = false,
}: Omit<PhotoCardProps, 'layout'>) {
  const { colors, radius } = useTheme();
  const { t } = useI18n();
  const [notesOpen, setNotesOpen] = useState(false);
  const marked = hasAnnotations(photo.annotations);

  return (
    <>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={280}
        accessibilityRole="button"
        accessibilityHint={t('photos.reorderLongPressHint')}
        accessibilityLabel={
          photo.caption ? t('photos.photoCardA11yWithCaption', { caption: photo.caption }) : t('photos.photoCardA11y')
        }
        style={[styles.compact, { borderRadius: radius.md, backgroundColor: colors.surfaceSunken }]}
      >
        <LocalImage uri={photo.thumbnailUri} style={StyleSheet.absoluteFill} contentFit="cover" />
        {marked && !reorderMode ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation?.();
              setNotesOpen(true);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('photos.viewAnnotationsA11y')}
            style={[styles.markupBadge, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="document-text" size={14} color={colors.accentOnAccent} />
          </Pressable>
        ) : null}
        {reorderMode ? (
          <View style={[styles.dragBadge, { backgroundColor: 'rgba(16,19,16,0.72)' }]}>
            <Ionicons name="menu" size={14} color="#FFFFFF" />
          </View>
        ) : null}
      </Pressable>

      <CompactAnnotationSheet photo={photo} visible={notesOpen} onClose={() => setNotesOpen(false)} />
    </>
  );
}

function CompactAnnotationSheet({
  photo,
  visible,
  onClose,
}: {
  photo: Photo;
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const callouts = listCallouts(photo.annotations);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setFrame({ width, height });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={640}>
      <Text variant="h3" style={{ marginBottom: spacing.sm }}>
        {t('photoAnnotate.cardsTitle')}
      </Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.md }}>
        <View
          onLayout={onLayout}
          style={[
            styles.sheetFrame,
            {
              aspectRatio: FULL_WIDTH_ASPECT,
              backgroundColor: colors.surfaceSunken,
              borderRadius: radius.md,
            },
          ]}
        >
          <LocalImage uri={photo.localUri} style={StyleSheet.absoluteFill} contentFit="cover" />
          {frame.width > 0 && hasAnnotations(photo.annotations) ? (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <PhotoAnnotationShapes annotations={photo.annotations} width={frame.width} height={frame.height} />
            </View>
          ) : null}
        </View>

        {callouts.length > 0 ? (
          callouts.map((item) => (
            <View
              key={item.number}
              style={[styles.noteCard, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}
            >
              <View style={[styles.noteBadge, { backgroundColor: item.shape.color }]}>
                <Text variant="caption" color={item.shape.color === '#FFFFFF' ? '#101310' : '#FFFFFF'}>
                  {item.number}
                </Text>
              </View>
              <Text variant="bodySmall" color={colors.textPrimary} style={{ flex: 1 }}>
                {item.shape.note.trim() || t('photoAnnotate.cardPlaceholder')}
              </Text>
            </View>
          ))
        ) : (
          <Text variant="bodySmall" color={colors.textSecondary}>
            {t('photos.annotationsMarkupOnly')}
          </Text>
        )}

        <Text variant="bodySmall" color={photo.caption ? colors.textPrimary : colors.textTertiary}>
          {photo.caption?.trim() || t('photos.captionEmpty')}
        </Text>
      </ScrollView>
    </BottomSheet>
  );
}

/** Landscape card frame — keeps tall camera shots from becoming huge vertical cards. */
const FULL_WIDTH_ASPECT = 4 / 3;

function FullWidthPhotoCard({
  photo,
  onPress,
  onLongPress,
  reorderMode = false,
}: Omit<PhotoCardProps, 'layout'>) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const callouts = listCallouts(photo.annotations);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setFrame({ width, height });
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      accessibilityRole="button"
      accessibilityHint={t('photos.reorderLongPressHint')}
      accessibilityLabel={
        photo.caption ? t('photos.photoCardA11yWithCaption', { caption: photo.caption }) : t('photos.photoCardA11y')
      }
      style={[styles.fullCard, { borderRadius: radius.md, backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View
        onLayout={onLayout}
        style={[
          styles.fullFrame,
          {
            aspectRatio: FULL_WIDTH_ASPECT,
            backgroundColor: colors.surfaceSunken,
            borderTopLeftRadius: radius.md,
            borderTopRightRadius: radius.md,
          },
        ]}
      >
        <LocalImage uri={photo.localUri} style={StyleSheet.absoluteFill} contentFit="cover" />
        {frame.width > 0 && hasAnnotations(photo.annotations) ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <PhotoAnnotationShapes annotations={photo.annotations} width={frame.width} height={frame.height} />
          </View>
        ) : null}
        {reorderMode ? (
          <View style={[styles.dragBadge, { backgroundColor: 'rgba(16,19,16,0.72)' }]}>
            <Ionicons name="menu" size={14} color="#FFFFFF" />
          </View>
        ) : null}
      </View>

      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        {callouts.map((item) => (
          <View
            key={item.number}
            style={[styles.noteCard, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}
          >
            <View style={[styles.noteBadge, { backgroundColor: item.shape.color }]}>
              <Text variant="caption" color={item.shape.color === '#FFFFFF' ? '#101310' : '#FFFFFF'}>
                {item.number}
              </Text>
            </View>
            <Text variant="bodySmall" color={colors.textPrimary} style={{ flex: 1 }}>
              {item.shape.note.trim() || t('photoAnnotate.cardPlaceholder')}
            </Text>
          </View>
        ))}
        <Text variant="bodySmall" color={photo.caption ? colors.textPrimary : colors.textTertiary}>
          {photo.caption?.trim() || t('photos.captionEmpty')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compact: {
    aspectRatio: 1,
    overflow: 'hidden',
    flex: 1,
  },
  fullCard: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  fullFrame: {
    width: '100%',
    overflow: 'hidden',
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noteBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  markupBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetFrame: {
    width: '100%',
    overflow: 'hidden',
  },
});

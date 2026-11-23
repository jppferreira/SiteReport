import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton, LoadingState, NavigationHeader, Screen, useToast } from '@/components';
import { photoAreasRepository, photosRepository } from '@/database';
import { PhotoAnnotationEditor } from '@/features/photos/PhotoAnnotationEditor';
import { useI18n } from '@/i18n/useI18n';
import { emptyAnnotations, Photo, PhotoAnnotations } from '@/models';
import { useTheme } from '@/theme';

function formatStageTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function PhotoAnnotateScreen() {
  const { id, photoId } = useLocalSearchParams<{ id: string; photoId: string }>();
  const { spacing } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const annotationsRef = useRef<PhotoAnnotations>(emptyAnnotations());

  useEffect(() => {
    photosRepository.getPhoto(photoId).then((next) => {
      setPhoto(next);
      setCaption(next?.caption ?? '');
      annotationsRef.current = next?.annotations ?? emptyAnnotations();
      if (next?.areaId) {
        photoAreasRepository.getArea(next.areaId).then((area) => setAreaName(area?.name ?? null));
      } else {
        setAreaName(t('photos.wholeJob'));
      }
    });
  }, [photoId, t]);

  const stageBadge = useMemo(() => {
    if (!photo) return null;
    const stage =
      photo.type === 'before'
        ? t('photos.stageBefore')
        : photo.type === 'during'
          ? t('photos.stageDuring')
          : t('photos.stageAfter');
    const time = formatStageTime(photo.takenAt ?? photo.createdAt);
    return time ? `${stage} · ${time}` : stage;
  }, [photo, t]);

  if (!photo) {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']}>
        <LoadingState />
      </Screen>
    );
  }

  const saveAndClose = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await photosRepository.updatePhoto(photo.id, {
        annotations: annotationsRef.current,
        caption: caption.trim() || null,
      });
      showToast({ message: t('photoAnnotate.toastSaved'), tone: 'success' });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <NavigationHeader
        title={areaName ?? t('photos.title')}
        onBack={() => router.back()}
        right={
          <IconButton
            name="ellipsis-horizontal"
            accessibilityLabel={t('photos.sectionOptionsA11y')}
            onPress={() => router.push(`/job/${id}/photo/${photo.id}`)}
            size={20}
            style={{ width: 40, height: 40 }}
          />
        }
      />

      <View style={[styles.body, { paddingHorizontal: spacing.lg, paddingBottom: spacing.md }]}>
        <PhotoAnnotationEditor
          uri={photo.localUri}
          photoWidth={photo.width}
          photoHeight={photo.height}
          initial={photo.annotations}
          caption={caption}
          onCaptionChange={setCaption}
          stageBadge={stageBadge}
          onDone={saveAndClose}
          doneLoading={saving}
          onChange={(next) => {
            annotationsRef.current = next;
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
});

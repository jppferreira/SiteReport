import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, KeyboardAvoidingView, Pressable, StyleSheet, View } from 'react-native';

import {
  ConfirmationDialog,
  IconButton,
  Input,
  LoadingState,
  LocalImage,
  PermissionNotice,
  Screen,
  StatusBadge,
  Text,
  useToast,
} from '@/components';
import { jobsRepository, photosRepository } from '@/database';
import { BottomSheetMenu } from '@/features/jobs/BottomSheetMenu';
import { useAutosaveField } from '@/hooks/useAutosaveField';
import { usePhotoAreas } from '@/hooks/usePhotoAreas';
import { usePhotos } from '@/hooks/usePhotos';
import { Photo, PhotoType } from '@/models';
import { deleteFileSafely } from '@/services/fileService';
import { requestPhotoLibraryAccess } from '@/services/photoLibraryAccess';
import { processJobPhoto } from '@/services/imageService';
import { resolveTakenAt } from '@/services/photoTakenAt';
import { generateId } from '@/utils/id';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PhotoDetailScreen() {
  const { id, photoId } = useLocalSearchParams<{ id: string; photoId: string }>();
  const { spacing } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [currentPhoto, setCurrentPhoto] = useState<Photo | null>(null);
  const [type, setType] = useState<PhotoType | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState<'camera' | 'library' | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null);
  const { areas } = usePhotoAreas(id);

  useEffect(() => {
    photosRepository.getPhoto(photoId).then((photo) => {
      setCurrentPhoto(photo);
      setType(photo?.type ?? null);
    });
  }, [photoId]);

  useEffect(() => {
    jobsRepository.getJob(id).then((job) => setCoverPhotoId(job?.coverPhotoId ?? null));
  }, [id]);

  const { photos, loading: photosLoading } = usePhotos(
    id,
    type ?? 'before',
    currentPhoto ? { areaId: currentPhoto.areaId } : { enabled: false }
  );
  const initialIndex = useMemo(() => photos.findIndex((p) => p.id === photoId), [photos, photoId]);

  const { value: caption, onChange: onCaptionChange, flush } = useAutosaveField(
    currentPhoto?.caption ?? '',
    async (value) => {
      await photosRepository.updatePhoto(photoId, { caption: value || null });
    }
  );

  if (!currentPhoto || !type || photosLoading) {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']} style={{ backgroundColor: '#101310' }}>
        <LoadingState />
      </Screen>
    );
  }

  const handleToggleCategory = async () => {
    const nextType: PhotoType = type === 'before' ? 'after' : 'before';
    await flush();
    await photosRepository.updatePhoto(photoId, { type: nextType });
    showToast({ message: nextType === 'before' ? t('photoDetail.toastMovedToBefore') : t('photoDetail.toastMovedToAfter'), tone: 'success' });
    router.back();
  };

  const handleDelete = async () => {
    await deleteFileSafely(currentPhoto.localUri);
    await deleteFileSafely(currentPhoto.thumbnailUri);
    await photosRepository.deletePhoto(photoId);
    showToast({ message: t('photoDetail.toastDeleted'), tone: 'neutral' });
    router.back();
  };

  const moveTo = async (nextAreaId: string | null, label: string) => {
    await flush();
    await photosRepository.updatePhoto(photoId, { areaId: nextAreaId });
    showToast({ message: nextAreaId ? t('photoDetail.toastMovedToNamed', { name: label }) : t('photoDetail.toastMovedToWholeJob'), tone: 'success' });
    router.back();
  };

  const moveTargets = [
    ...areas
      .filter((area) => area.id !== currentPhoto.areaId)
      .map((area) => ({
        icon: 'albums-outline' as const,
        label: area.name,
        onPress: () => moveTo(area.id, area.name),
      })),
    ...(currentPhoto.areaId
      ? [{ icon: 'albums-outline' as const, label: t('photoDetail.wholeJob'), onPress: () => moveTo(null, t('photoDetail.wholeJob')) }]
      : []),
  ];

  const isCover = currentPhoto.id === coverPhotoId;

  const handleCover = async () => {
    const next = isCover ? null : currentPhoto.id;
    await jobsRepository.setCoverPhoto(id, next);
    setCoverPhotoId(next);
    showToast({
      message: next ? t('photoDetail.toastCoverSaved') : t('photoDetail.toastCoverRemoved'),
      tone: next ? 'success' : 'neutral',
    });
  };

  const handleReplace = async () => {
    const allowed = await requestPhotoLibraryAccess();
    if (!allowed) {
      setPermissionDenied('library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, exif: true });
    if (result.canceled || result.assets.length === 0) return;

    setReplacing(true);
    try {
      const asset = result.assets[0]!;
      const newPhotoId = generateId();
      const wasCover = coverPhotoId === photoId;
      const takenAt = resolveTakenAt({ source: 'library', exif: asset.exif });
      const processed = await processJobPhoto(id, newPhotoId, asset.uri, asset.width, asset.height);
      await deleteFileSafely(currentPhoto.localUri);
      await deleteFileSafely(currentPhoto.thumbnailUri);
      await photosRepository.deletePhoto(photoId);
      const newPhoto = await photosRepository.addPhoto({
        jobId: id,
        areaId: currentPhoto.areaId,
        type,
        localUri: processed.localUri,
        thumbnailUri: processed.thumbnailUri,
        caption: currentPhoto.caption,
        width: processed.width,
        height: processed.height,
        sortOrder: currentPhoto.sortOrder,
        takenAt,
      });
      if (wasCover) {
        await jobsRepository.setCoverPhoto(id, newPhoto.id);
        setCoverPhotoId(newPhoto.id);
      }
      router.replace(`/job/${id}/photo/${newPhoto.id}`);
    } finally {
      setReplacing(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} style={{ backgroundColor: '#101310' }}>
      <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
        <IconButton
          name="chevron-down"
          accessibilityLabel={t('photoDetail.closeA11y')}
          variant="ghost"
          color="#FFFFFF"
          onPress={async () => {
            await flush();
            router.back();
          }}
        />
        <StatusBadge label={type === 'before' ? t('photoDetail.beforeBadge') : t('photoDetail.afterBadge')} tone={type === 'before' ? 'warning' : 'success'} />
        <IconButton
          name="trash-outline"
          accessibilityLabel={t('photoDetail.deleteA11y')}
          variant="ghost"
          color="#FFFFFF"
          onPress={() => setConfirmDelete(true)}
        />
      </View>

      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        initialScrollIndex={initialIndex >= 0 ? initialIndex : 0}
        getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          const next = photos[index];
          if (next && next.id !== currentPhoto.id) {
            router.setParams({ photoId: next.id });
          }
        }}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            <LocalImage uri={item.localUri} style={StyleSheet.absoluteFill} contentFit="contain" />
          </View>
        )}
        style={{ flex: 1 }}
      />

      <KeyboardAvoidingView behavior="padding">
        <View style={[styles.footer, { padding: spacing.lg, backgroundColor: '#101310' }]}>
          <Input
            placeholder={t('photoDetail.captionPlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={caption}
            onChangeText={onCaptionChange}
            onBlur={flush}
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.16)', color: '#FFFFFF' }}
          />
          {isCover ? (
            <Text variant="caption" color="rgba(255,255,255,0.72)" style={{ marginTop: spacing.sm }}>
              {t('photoDetail.coverHint')}
            </Text>
          ) : null}
          <View style={[styles.actionsRow, { marginTop: spacing.sm, gap: spacing.sm }]}>
            <FooterAction icon="swap-horizontal" label={type === 'before' ? t('photoDetail.markAsAfter') : t('photoDetail.markAsBefore')} onPress={handleToggleCategory} />
            <FooterAction icon="images-outline" label={replacing ? t('photoDetail.replacing') : t('photoDetail.replace')} onPress={handleReplace} disabled={replacing} />
          </View>
          <View style={{ marginTop: spacing.sm }}>
            <FooterAction
              icon={isCover ? 'checkmark-circle' : 'image-outline'}
              label={isCover ? t('photoDetail.removeCover') : t('photoDetail.saveAsCover')}
              onPress={handleCover}
            />
          </View>
          {moveTargets.length > 0 ? (
            <View style={{ marginTop: spacing.sm }}>
              <FooterAction icon="albums-outline" label={t('photoDetail.moveToSection')} onPress={() => setMoveOpen(true)} />
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <ConfirmationDialog
        visible={confirmDelete}
        title={t('photoDetail.deleteTitle')}
        description={t('photoDetail.deleteDescription')}
        confirmLabel={t('photoDetail.deleteConfirm')}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <PermissionNotice visible={permissionDenied !== null} kind={permissionDenied ?? 'library'} onDismiss={() => setPermissionDenied(null)} />

      <BottomSheetMenu visible={moveOpen} onClose={() => setMoveOpen(false)} items={moveTargets} />
    </Screen>
  );
}

function FooterAction({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.footerAction,
        { backgroundColor: 'rgba(255,255,255,0.08)', opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={16} color="#FFFFFF" />
      <Text variant="bodySmall" color="#FFFFFF">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
  },
  footer: {},
  actionsRow: {
    flexDirection: 'row',
  },
  footerAction: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});

import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BottomSheet, LocalImage, PermissionNotice, Text, useToast } from '@/components';
import { jobsRepository, photosRepository } from '@/database';
import { useJobPhotos } from '@/hooks/usePhotos';
import { useI18n } from '@/i18n/useI18n';
import { Photo } from '@/models';
import { processJobPhoto } from '@/services/imageService';
import { requestPhotoLibraryAccess } from '@/services/photoLibraryAccess';
import { resolveTakenAt } from '@/services/photoTakenAt';
import { getPreferences } from '@/services/preferencesService';
import { useTheme } from '@/theme';
import { generateId } from '@/utils/id';
import { logger } from '@/utils/logger';

type CoverPickerSheetProps = {
  visible: boolean;
  jobId: string;
  coverPhotoId: string | null;
  onClose: () => void;
  onChanged: () => void;
};

/** Pick which job photo (or a new library photo) appears on the report cover. */
export function CoverPickerSheet({ visible, jobId, coverPhotoId, onClose, onChanged }: CoverPickerSheetProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { photos, loading, refresh } = useJobPhotos(jobId);
  const [currentCoverId, setCurrentCoverId] = useState<string | null>(coverPhotoId);
  const [busy, setBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentCoverId(coverPhotoId);
      void refresh();
    }
  }, [visible, coverPhotoId, refresh]);

  const applyCover = async (photoId: string | null) => {
    if (busy) return;
    setBusy(true);
    try {
      await jobsRepository.setCoverPhoto(jobId, photoId);
      setCurrentCoverId(photoId);
      showToast({
        message: photoId ? t('photoDetail.toastCoverSaved') : t('photoDetail.toastCoverRemoved'),
        tone: photoId ? 'success' : 'neutral',
      });
      onChanged();
      onClose();
    } catch (error) {
      logger.error('Failed to set cover photo', error);
      showToast({ message: t('preview.coverError'), tone: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const pickFromLibrary = async () => {
    if (busy) return;
    const allowed = await requestPhotoLibraryAccess();
    if (!allowed) {
      setPermissionDenied(true);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      exif: true,
    });
    if (result.canceled || result.assets.length === 0) return;

    setBusy(true);
    try {
      const asset = result.assets[0]!;
      const photoId = generateId();
      const { defaultPhotoQuality } = await getPreferences();
      const takenAt = resolveTakenAt({ source: 'library', exif: asset.exif });
      const processed = await processJobPhoto(
        jobId,
        photoId,
        asset.uri,
        asset.width,
        asset.height,
        defaultPhotoQuality
      );
      const photo = await photosRepository.addPhoto({
        jobId,
        areaId: null,
        type: 'after',
        localUri: processed.localUri,
        thumbnailUri: processed.thumbnailUri,
        caption: null,
        width: processed.width,
        height: processed.height,
        takenAt,
      });
      await jobsRepository.setCoverPhoto(jobId, photo.id);
      setCurrentCoverId(photo.id);
      showToast({ message: t('photoDetail.toastCoverSaved'), tone: 'success' });
      onChanged();
      onClose();
    } catch (error) {
      logger.error('Failed to add cover from library', error);
      showToast({ message: t('preview.coverError'), tone: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} maxHeight={560} dragHandleOnly>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.md }}>
          <Text variant="h3" style={{ marginBottom: spacing.xs }}>
            {t('preview.coverTitle')}
          </Text>
          <Text variant="body" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
            {t('preview.coverDescription')}
          </Text>

          <Pressable
            onPress={() => void pickFromLibrary()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('preview.coverFromLibrary')}
            style={({ pressed }) => [
              styles.actionRow,
              {
                backgroundColor: colors.surfaceSunken,
                borderRadius: radius.md,
                opacity: pressed || busy ? 0.8 : 1,
                marginBottom: spacing.sm,
              },
            ]}
          >
            <Text variant="bodyMedium">{t('preview.coverFromLibrary')}</Text>
          </Pressable>

          {currentCoverId ? (
            <Pressable
              onPress={() => void applyCover(null)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('preview.coverUseDefault')}
              style={({ pressed }) => [
                styles.actionRow,
                {
                  backgroundColor: colors.surfaceSunken,
                  borderRadius: radius.md,
                  opacity: pressed || busy ? 0.8 : 1,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <Text variant="bodyMedium">{t('preview.coverUseDefault')}</Text>
            </Pressable>
          ) : (
            <View style={{ marginBottom: spacing.md }} />
          )}

          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.lg }} />
          ) : photos.length === 0 ? (
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('preview.coverEmpty')}
            </Text>
          ) : (
            <View style={[styles.grid, { gap: spacing.sm }]}>
              {photos.map((item: Photo) => {
                const selected = item.id === currentCoverId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => void applyCover(item.id)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={t('preview.coverPhotoA11y')}
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.thumb,
                      {
                        borderRadius: radius.md,
                        borderColor: selected ? colors.accent : colors.border,
                        opacity: pressed || busy ? 0.75 : 1,
                      },
                    ]}
                  >
                    <LocalImage
                      uri={item.thumbnailUri || item.localUri}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </BottomSheet>

      <PermissionNotice
        visible={permissionDenied}
        kind="library"
        onDismiss={() => setPermissionDenied(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    minHeight: 48,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  thumb: {
    width: '31.5%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderWidth: 2,
  },
});

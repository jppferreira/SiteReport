import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/core/AppText';
import { Button } from '@/components/core/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { PhotoGrid } from '@/components/photos/PhotoGrid';
import type { Photo, PhotoType } from '@/models/domain';
import { databaseService } from '@/services/databaseService';
import { fileService } from '@/services/fileService';
import { permissionsService } from '@/services/permissionsService';
import { colors, radius, spacing } from '@/theme';

export default function PhotosScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [activeType, setActiveType] = useState<PhotoType>('before');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');

  const load = useCallback(async () => {
    if (!jobId) {
      return;
    }
    setLoading(true);
    const next = await databaseService.getPhotos(jobId);
    setPhotos(next);
    setLoading(false);
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const currentPhotos = photos.filter((photo) => photo.type === activeType);
  const beforeCount = photos.filter((photo) => photo.type === 'before').length;
  const afterCount = photos.filter((photo) => photo.type === 'after').length;

  const pickAndSave = async (source: 'camera' | 'library') => {
    if (!jobId) return;
    const permission =
      source === 'camera' ? await permissionsService.ensureCameraPermission() : await permissionsService.ensureMediaLibraryPermission();
    if (!permission.granted) {
      Alert.alert(
        source === 'camera' ? 'Camera access is turned off.' : 'Photo library access is turned off.',
        'Enable permission in settings to continue.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Open settings', onPress: () => void permissionsService.openDeviceSettings() }]
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ['images'] })
        : await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ['images'] });
    if (result.canceled || !result.assets[0]) return;

    const imported = await fileService.importPhoto(result.assets[0].uri, jobId);
    await databaseService.createPhoto({
      jobId,
      localUri: imported.localUri,
      thumbnailUri: imported.thumbnailUri,
      type: activeType,
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await databaseService.markReportsStale(jobId);
    await load();
  };

  const saveCaption = async () => {
    if (!selectedPhoto) return;
    await databaseService.updatePhoto(selectedPhoto.id, { caption: captionDraft });
    await Haptics.selectionAsync();
    if (jobId) {
      await databaseService.markReportsStale(jobId);
    }
    setSelectedPhoto(null);
    await load();
  };

  const replacePhoto = async () => {
    if (!selectedPhoto) return;
    const permission = await permissionsService.ensureMediaLibraryPermission();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ['images'] });
    if (result.canceled || !result.assets[0]) return;

    const replaced = await fileService.replacePhoto(result.assets[0].uri, selectedPhoto.localUri, selectedPhoto.thumbnailUri);
    await databaseService.updatePhoto(selectedPhoto.id, {
      localUri: replaced.localUri,
      thumbnailUri: replaced.thumbnailUri,
    });
    await Haptics.selectionAsync();
    if (jobId) {
      await databaseService.markReportsStale(jobId);
    }
    setSelectedPhoto(null);
    await load();
  };

  const deletePhoto = async () => {
    if (!selectedPhoto) return;
    const deleted = await databaseService.deletePhoto(selectedPhoto.id);
    await fileService.deleteMany([deleted?.local_uri, deleted?.thumbnail_uri].filter(Boolean) as string[]);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (jobId) {
      await databaseService.markReportsStale(jobId);
    }
    setSelectedPhoto(null);
    await load();
  };

  const updateCategory = async () => {
    if (!selectedPhoto) return;
    const nextType: PhotoType = selectedPhoto.type === 'before' ? 'after' : 'before';
    await databaseService.updatePhoto(selectedPhoto.id, { type: nextType });
    if (jobId) {
      await databaseService.markReportsStale(jobId);
    }
    setSelectedPhoto(null);
    await load();
  };

  const reorder = async (orderedIds: string[]) => {
    if (!jobId) return;
    await databaseService.reorderPhotos(jobId, activeType, orderedIds);
    await load();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="h2">Photos</AppText>
        <View style={styles.segmented}>
          <Pressable style={[styles.segment, activeType === 'before' && styles.segmentActive]} onPress={() => setActiveType('before')}>
            <AppText variant="bodySmall" color={activeType === 'before' ? colors.textPrimary : colors.textSecondary}>
              Before · {beforeCount}
            </AppText>
          </Pressable>
          <Pressable style={[styles.segment, activeType === 'after' && styles.segmentActive]} onPress={() => setActiveType('after')}>
            <AppText variant="bodySmall" color={activeType === 'after' ? colors.textPrimary : colors.textSecondary}>
              After · {afterCount}
            </AppText>
          </Pressable>
        </View>
        <View style={styles.actions}>
          <Button label="Take photo" onPress={() => void pickAndSave('camera')} />
          <Button label="Choose from library" variant="secondary" onPress={() => void pickAndSave('library')} />
        </View>

        {loading ? (
          <LoadingState label="Loading photos…" />
        ) : currentPhotos.length === 0 ? (
          <EmptyState
            title={activeType === 'before' ? 'Show what you found' : 'Show the finished work'}
            description="Take a photo or choose one from your library."
          />
        ) : (
          <View style={styles.gridWrap}>
            <PhotoGrid
              photos={currentPhotos}
              onPressPhoto={(photo) => {
                setSelectedPhoto(photo);
                setCaptionDraft(photo.caption ?? '');
              }}
              onReorder={(orderedIds) => void reorder(orderedIds)}
            />
          </View>
        )}
      </ScrollView>

      <Modal visible={Boolean(selectedPhoto)} animationType="slide" onRequestClose={() => setSelectedPhoto(null)}>
        <SafeAreaView style={styles.modalSafe}>
          {selectedPhoto ? (
            <View style={styles.modalContent}>
              <Image source={{ uri: selectedPhoto.localUri }} style={styles.modalImage} />
              <AppText variant="bodySmall" color={colors.textSecondary}>
                {selectedPhoto.type === 'before' ? 'Before photo' : 'After photo'}
              </AppText>
              <TextInput
                value={captionDraft}
                onChangeText={setCaptionDraft}
                placeholder="Describe what this photo shows…"
                placeholderTextColor={colors.textSecondary}
                style={styles.captionInput}
                multiline
              />
              <Button label="Save caption" onPress={() => void saveCaption()} />
              <Button label="Change category" variant="secondary" onPress={() => void updateCategory()} />
              <Button label="Replace photo" variant="secondary" onPress={() => void replacePhoto()} />
              <Button label="Delete photo" variant="destructive" onPress={() => void deletePhoto()} />
              <Button label="Close" variant="tertiary" onPress={() => setSelectedPhoto(null)} />
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.x4,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    padding: spacing.xxs,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    borderRadius: radius.pill,
  },
  segmentActive: {
    backgroundColor: '#EEF3EE',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  gridWrap: {
    minHeight: 380,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalContent: {
    flex: 1,
    padding: spacing.screenHorizontal,
    gap: spacing.sm,
  },
  modalImage: {
    width: '100%',
    height: 320,
    borderRadius: radius.large,
    backgroundColor: colors.skeleton,
  },
  captionInput: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    padding: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
  },
});

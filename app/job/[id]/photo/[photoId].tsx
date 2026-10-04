import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import {
  ConfirmationDialog,
  IconButton,
  Input,
  LoadingState,
  PermissionNotice,
  Screen,
  StatusBadge,
  Text,
  useToast,
} from '@/components';
import { photosRepository } from '@/database';
import { useAutosaveField } from '@/hooks/useAutosaveField';
import { usePhotos } from '@/hooks/usePhotos';
import { Photo, PhotoType } from '@/models';
import { deleteFileSafely } from '@/services/fileService';
import { processJobPhoto } from '@/services/imageService';
import { generateId } from '@/utils/id';
import { useTheme } from '@/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PhotoDetailScreen() {
  const { id, photoId } = useLocalSearchParams<{ id: string; photoId: string }>();
  const { spacing } = useTheme();
  const { showToast } = useToast();
  const [currentPhoto, setCurrentPhoto] = useState<Photo | null>(null);
  const [type, setType] = useState<PhotoType | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState<'camera' | 'library' | null>(null);
  const [replacing, setReplacing] = useState(false);

  useEffect(() => {
    photosRepository.getPhoto(photoId).then((photo) => {
      setCurrentPhoto(photo);
      setType(photo?.type ?? null);
    });
  }, [photoId]);

  const { photos } = usePhotos(id, type ?? 'before');
  const initialIndex = useMemo(() => photos.findIndex((p) => p.id === photoId), [photos, photoId]);

  const { value: caption, onChange: onCaptionChange, flush } = useAutosaveField(
    currentPhoto?.caption ?? '',
    async (value) => {
      await photosRepository.updatePhoto(photoId, { caption: value || null });
    }
  );

  if (!currentPhoto || !type) {
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
    showToast({ message: `Moved to ${nextType === 'before' ? 'Before' : 'After'}`, tone: 'success' });
    router.back();
  };

  const handleDelete = async () => {
    await deleteFileSafely(currentPhoto.localUri);
    await deleteFileSafely(currentPhoto.thumbnailUri);
    await photosRepository.deletePhoto(photoId);
    showToast({ message: 'Photo deleted', tone: 'neutral' });
    router.back();
  };

  const handleReplace = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPermissionDenied('library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || result.assets.length === 0) return;

    setReplacing(true);
    try {
      const asset = result.assets[0]!;
      const newPhotoId = generateId();
      const processed = await processJobPhoto(id, newPhotoId, asset.uri, asset.width, asset.height);
      await deleteFileSafely(currentPhoto.localUri);
      await deleteFileSafely(currentPhoto.thumbnailUri);
      await photosRepository.deletePhoto(photoId);
      const newPhoto = await photosRepository.addPhoto({
        jobId: id,
        type,
        localUri: processed.localUri,
        thumbnailUri: processed.thumbnailUri,
        caption: currentPhoto.caption,
        width: processed.width,
        height: processed.height,
        sortOrder: currentPhoto.sortOrder,
      });
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
          accessibilityLabel="Close"
          variant="ghost"
          color="#FFFFFF"
          onPress={async () => {
            await flush();
            router.back();
          }}
        />
        <StatusBadge label={type === 'before' ? 'BEFORE' : 'AFTER'} tone={type === 'before' ? 'warning' : 'success'} />
        <IconButton
          name="trash-outline"
          accessibilityLabel="Delete photo"
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
            <Image source={{ uri: item.localUri }} style={StyleSheet.absoluteFill} contentFit="contain" />
          </View>
        )}
        style={{ flex: 1 }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.footer, { padding: spacing.lg, backgroundColor: '#101310' }]}>
          <Input
            placeholder="Describe what this photo shows…"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={caption}
            onChangeText={onCaptionChange}
            onBlur={flush}
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.16)', color: '#FFFFFF' }}
          />
          <View style={[styles.actionsRow, { marginTop: spacing.sm, gap: spacing.sm }]}>
            <FooterAction icon="swap-horizontal" label={type === 'before' ? 'Mark as After' : 'Mark as Before'} onPress={handleToggleCategory} />
            <FooterAction icon="image-outline" label={replacing ? 'Replacing…' : 'Replace'} onPress={handleReplace} disabled={replacing} />
          </View>
        </View>
      </KeyboardAvoidingView>

      <ConfirmationDialog
        visible={confirmDelete}
        title="Delete this photo?"
        description="This photo will be permanently removed from the job."
        confirmLabel="Delete photo"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <PermissionNotice visible={permissionDenied !== null} kind={permissionDenied ?? 'library'} onDismiss={() => setPermissionDenied(null)} />
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

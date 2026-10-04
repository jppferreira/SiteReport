import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  Button,
  EmptyState,
  NavigationHeader,
  PermissionNotice,
  Screen,
  SegmentedControl,
  Skeleton,
  Text,
  TextButton,
} from '@/components';
import { photosRepository } from '@/database';
import { PhotoCaptureSheet } from '@/features/photos/PhotoCaptureSheet';
import { PhotoGrid } from '@/features/photos/PhotoGrid';
import { usePhotoCapture } from '@/hooks/usePhotoCapture';
import { usePhotos } from '@/hooks/usePhotos';
import { PhotoType } from '@/models';
import { useTheme } from '@/theme';

export default function PhotosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const [type, setType] = useState<PhotoType>('before');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  const before = usePhotos(id, 'before');
  const after = usePhotos(id, 'after');
  const active = type === 'before' ? before : after;

  const { capture, processing, error, permissionDenied, clearPermissionDenied } = usePhotoCapture(id, type, () => {
    active.refresh();
  });

  const handleReorder = async (orderedIds: string[]) => {
    await photosRepository.reorderPhotos(id, type, orderedIds);
    active.refresh();
  };

  const emptyCopy =
    type === 'before'
      ? { title: 'Show what you found', description: 'Add a photo of the job before you start work.' }
      : { title: 'Show the finished work', description: 'Add a photo of the completed job.' };

  return (
    <Screen>
      <NavigationHeader
        title="Photos"
        onBack={() => router.back()}
        right={
          active.photos.length > 0 ? (
            <TextButton label={reorderMode ? 'Done' : 'Reorder'} onPress={() => setReorderMode((v) => !v)} />
          ) : undefined
        }
      />

      <View style={{ paddingHorizontal: spacing.lg }}>
        <SegmentedControl
          segments={[
            { key: 'before', label: `Before · ${before.photos.length}` },
            { key: 'after', label: `After · ${after.photos.length}` },
          ]}
          value={type}
          onChange={(key) => setType(key as PhotoType)}
        />
      </View>

      {error ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <Text variant="bodySmall" color={colors.destructive}>
            {error}
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
        {active.loading ? (
          <View style={{ gap: spacing.xs }}>
            <Skeleton height={110} radius={12} />
          </View>
        ) : active.photos.length === 0 ? (
          <EmptyState
            icon="camera-outline"
            title={emptyCopy.title}
            description={emptyCopy.description}
            actionLabel="Add photo"
            onAction={() => setSheetOpen(true)}
          />
        ) : (
          <PhotoGrid
            photos={active.photos}
            reorderMode={reorderMode}
            onReorder={handleReorder}
            onPressPhoto={(photo) => {
              if (reorderMode) return;
              router.push(`/job/${id}/photo/${photo.id}`);
            }}
          />
        )}
      </ScrollView>

      {!reorderMode ? (
        <View style={{ padding: spacing.lg, paddingTop: 0 }}>
          <Button
            label={processing ? 'Adding photo…' : 'Add photo'}
            onPress={() => setSheetOpen(true)}
            loading={processing}
          />
        </View>
      ) : null}

      <PhotoCaptureSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onTakePhoto={() => capture('camera')}
        onChooseFromLibrary={() => capture('library')}
        label={type}
      />

      <PermissionNotice
        visible={permissionDenied !== null}
        kind={permissionDenied ?? 'camera'}
        onDismiss={clearPermissionDenied}
      />
    </Screen>
  );
}

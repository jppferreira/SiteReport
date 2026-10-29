import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  Button,
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  IconButton,
  NavigationHeader,
  PermissionNotice,
  Screen,
  SegmentedControl,
  Skeleton,
  Text,
  TextButton,
  useToast,
} from '@/components';
import { photoAreasRepository, photosRepository } from '@/database';
import { AreaNameDialog } from '@/features/photos/AreaNameDialog';
import { BottomSheetMenu } from '@/features/jobs/BottomSheetMenu';
import { PhotoCaptureSheet } from '@/features/photos/PhotoCaptureSheet';
import { PhotoGrid } from '@/features/photos/PhotoGrid';
import { usePhotoArea } from '@/hooks/usePhotoAreas';
import { usePhotoCapture } from '@/hooks/usePhotoCapture';
import { usePhotos } from '@/hooks/usePhotos';
import { isWholeJobArea, PhotoType } from '@/models';
import { deleteFileSafely } from '@/services/fileService';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { goBack } from '@/utils/goBack';

export default function SectionPhotosScreen() {
  const { id, areaId: areaParam } = useLocalSearchParams<{ id: string; areaId: string }>();
  const areaId = Array.isArray(areaParam) ? areaParam[0] : areaParam;
  const wholeJob = isWholeJobArea(areaId);
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { area, loading: areaLoading, missing, setArea } = usePhotoArea(wholeJob ? null : areaId);
  const [type, setType] = useState<PhotoType>('before');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const storedAreaId = wholeJob ? null : areaId;
  const before = usePhotos(id, 'before', { areaId: storedAreaId });
  const after = usePhotos(id, 'after', { areaId: storedAreaId });
  const active = type === 'before' ? before : after;

  const { capture, processing, error, permissionDenied, clearPermissionDenied } = usePhotoCapture(
    id,
    type,
    storedAreaId,
    () => {
      active.refresh();
    }
  );

  const refreshBefore = before.refresh;
  const refreshAfter = after.refresh;

  useFocusEffect(
    useCallback(() => {
      refreshBefore();
      refreshAfter();
    }, [refreshBefore, refreshAfter])
  );

  const handleReorder = async (orderedIds: string[]) => {
    await photosRepository.reorderPhotos(id, type, orderedIds, storedAreaId);
    active.refresh();
  };

  const handleRename = async (name: string) => {
    if (!area || savingName) return;
    setSavingName(true);
    try {
      const renamed = await photoAreasRepository.renameArea(area.id, name);
      if (renamed) {
        setArea(renamed);
        setRenaming(false);
      }
    } catch {
      showToast({ message: t('photos.toastSectionRenameError'), tone: 'neutral' });
    } finally {
      setSavingName(false);
    }
  };

  const handleDelete = async () => {
    if (!area) return;
    setDeleting(true);
    try {
      const photos = await photoAreasRepository.deleteArea(area.id);
      await Promise.all(photos.flatMap((photo) => [deleteFileSafely(photo.localUri), deleteFileSafely(photo.thumbnailUri)]));
      showToast({ message: t('photos.toastSectionDeleted'), tone: 'neutral' });
      goBack(`/job/${id}/photos`);
    } catch {
      showToast({ message: t('photos.toastSectionDeleteError'), tone: 'neutral' });
      setDeleting(false);
    }
  };

  if (!wholeJob && areaLoading && !area) {
    return (
      <Screen>
        <NavigationHeader title={t('photos.title')} onBack={() => goBack(`/job/${id}/photos`)} />
        <Skeleton height={120} radius={12} />
      </Screen>
    );
  }

  if (!wholeJob && (missing || !area)) {
    return (
      <Screen>
        <NavigationHeader title={t('photos.title')} onBack={() => goBack(`/job/${id}/photos`)} />
        <ErrorState title={t('photos.sectionNotFound')} onAction={() => goBack(`/job/${id}/photos`)} actionLabel={t('common.goBack')} />
      </Screen>
    );
  }

  const title = wholeJob ? t('photos.wholeJob') : area?.name ?? t('photos.sectionFallbackTitle');
  const emptyCopy =
    type === 'before'
      ? {
          title: t('photos.emptyBeforeTitle'),
          description: wholeJob
            ? t('photos.emptyBeforeWholeJob')
            : t('photos.emptyBeforeNamed', { name: title }),
        }
      : {
          title: t('photos.emptyAfterTitle'),
          description: wholeJob
            ? t('photos.emptyAfterWholeJob')
            : t('photos.emptyAfterNamed', { name: title }),
        };

  return (
    <Screen>
      <NavigationHeader
        title={title}
        onBack={() => goBack(`/job/${id}/photos`)}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {active.photos.length > 0 ? (
              <TextButton label={reorderMode ? t('photos.done') : t('photos.reorder')} onPress={() => setReorderMode((value) => !value)} />
            ) : null}
            {wholeJob ? null : (
              <IconButton name="ellipsis-horizontal" accessibilityLabel={t('photos.sectionOptionsA11y')} onPress={() => setMenuOpen(true)} />
            )}
          </View>
        }
      />

      <View style={{ paddingHorizontal: spacing.lg }}>
        <SegmentedControl
          segments={[
            { key: 'before', label: t('photos.beforeCount', { count: before.photos.length }) },
            { key: 'after', label: t('photos.afterCount', { count: after.photos.length }) },
          ]}
          value={type}
          onChange={(key) => {
            setReorderMode(false);
            setType(key as PhotoType);
          }}
        />
      </View>

      {error || active.error ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <Text variant="bodySmall" color={colors.destructive}>
            {error ?? active.error}
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
        {active.loading ? (
          <Skeleton height={110} radius={12} />
        ) : active.photos.length === 0 ? (
          <EmptyState
            icon="camera-outline"
            title={emptyCopy.title}
            description={emptyCopy.description}
            actionLabel={t('photos.addPhoto')}
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
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
          <Text variant="caption" color={colors.textSecondary}>
            {wholeJob
              ? t('photos.hintWholeJob')
              : t('photos.hintSection')}
          </Text>
        </View>
      ) : null}

      {!reorderMode ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, paddingTop: 0 }}>
          <View style={{ flex: 1 }}>
            <Button
              label={t('photos.camera')}
              icon={<Ionicons name="camera" size={18} color={colors.accentOnAccent} />}
              onPress={() => capture('camera')}
              loading={processing}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={t('photos.gallery')}
              variant="secondary"
              icon={<Ionicons name="images-outline" size={18} color={colors.textPrimary} />}
              onPress={() => capture('library')}
            />
          </View>
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

      <BottomSheetMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={[
          { icon: 'create-outline', label: t('photos.renameSection'), onPress: () => setRenaming(true) },
          {
            icon: 'trash-outline',
            label: t('photos.deleteSection'),
            destructive: true,
            onPress: () => setConfirmDelete(true),
          },
        ]}
      />

      {renaming && area ? (
        <AreaNameDialog
          key={area.name}
          visible
          title={t('photos.renameSection')}
          confirmLabel={t('common.save')}
          initialName={area.name}
          saving={savingName}
          onCancel={() => {
            if (!savingName) setRenaming(false);
          }}
          onSubmit={handleRename}
        />
      ) : null}

      <ConfirmationDialog
        visible={confirmDelete}
        title={area ? t('photos.deleteSectionTitleNamed', { name: area.name }) : t('photos.deleteSectionTitle')}
        description={t('photos.deleteSectionDescription')}
        confirmLabel={t('photos.deleteSectionConfirm')}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        loading={deleting}
      />
    </Screen>
  );
}

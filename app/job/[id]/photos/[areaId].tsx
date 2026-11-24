import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import {
  CapturedAnnotateResult,
  PhotoCaptureAnnotateModal,
} from '@/features/photos/PhotoCaptureAnnotateModal';
import { PhotoCaptureSheet } from '@/features/photos/PhotoCaptureSheet';
import { PhotoGrid } from '@/features/photos/PhotoGrid';
import { useEntitlement } from '@/hooks/useEntitlement';
import { usePhotoArea } from '@/hooks/usePhotoAreas';
import { usePhotoCapture } from '@/hooks/usePhotoCapture';
import { usePhotos } from '@/hooks/usePhotos';
import { isWholeJobArea, normalizePhotoBrowseLayout, PhotoBrowseLayout, PhotoType } from '@/models';
import { deleteFileSafely } from '@/services/fileService';
import { processJobPhoto } from '@/services/imageService';
import { resolveTakenAt } from '@/services/photoTakenAt';
import { getPreferences, savePreferences } from '@/services/preferencesService';
import { generateId } from '@/utils/id';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { goBack } from '@/utils/goBack';

export default function SectionPhotosScreen() {
  const { id, areaId: areaParam } = useLocalSearchParams<{ id: string; areaId: string }>();
  const areaId = Array.isArray(areaParam) ? areaParam[0] : areaParam;
  const wholeJob = isWholeJobArea(areaId);
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { isPro } = useEntitlement();
  const { showToast } = useToast();
  const { area, loading: areaLoading, missing, setArea } = usePhotoArea(wholeJob ? null : areaId);
  const [type, setType] = useState<PhotoType>('before');
  const [browseLayout, setBrowseLayout] = useState<PhotoBrowseLayout>('fullWidth');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderingDrag, setReorderingDrag] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [savingCapture, setSavingCapture] = useState(false);

  useEffect(() => {
    getPreferences().then((prefs) => setBrowseLayout(normalizePhotoBrowseLayout(prefs.photoBrowseLayout)));
  }, []);

  const storedAreaId = wholeJob ? null : areaId;
  const before = usePhotos(id, 'before', { areaId: storedAreaId });
  const during = usePhotos(id, 'during', { areaId: storedAreaId });
  const after = usePhotos(id, 'after', { areaId: storedAreaId });
  const active = type === 'before' ? before : type === 'during' ? during : after;

  const { capture, processing, error, permissionDenied, clearPermissionDenied } = usePhotoCapture(
    id,
    type,
    storedAreaId,
    (photo, meta) => {
      active.refresh();
      // Library picks still open the markup screen; camera uses the live modal.
      if (meta.source === 'library' && meta.total === 1 && meta.index === 0) {
        if (!isPro) {
          router.push({ pathname: '/paywall', params: { trigger: 'photo_markup' } });
          return;
        }
        router.push(`/job/${id}/annotate/${photo.id}`);
      }
    }
  );

  const openCamera = () => setCameraOpen(true);

  const saveCapturedPhoto = async (result: CapturedAnnotateResult) => {
    setSavingCapture(true);
    try {
      const photoId = generateId();
      const { defaultPhotoQuality } = await getPreferences();
      const processed = await processJobPhoto(
        id,
        photoId,
        result.uri,
        result.width,
        result.height,
        defaultPhotoQuality
      );
      await photosRepository.addPhoto({
        jobId: id,
        areaId: storedAreaId,
        type,
        localUri: processed.localUri,
        thumbnailUri: processed.thumbnailUri,
        caption: null,
        width: processed.width,
        height: processed.height,
        takenAt: resolveTakenAt({ source: 'camera', exif: null, capturedAt: new Date().toISOString() }),
        annotations: result.annotations,
      });
      active.refresh();
      showToast({ message: t('photoAnnotate.toastSaved'), tone: 'success' });
    } finally {
      setSavingCapture(false);
    }
  };

  const refreshBefore = before.refresh;
  const refreshDuring = during.refresh;
  const refreshAfter = after.refresh;

  useFocusEffect(
    useCallback(() => {
      refreshBefore();
      refreshDuring();
      refreshAfter();
    }, [refreshBefore, refreshDuring, refreshAfter])
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
      : type === 'during'
        ? {
            title: t('photos.emptyDuringTitle'),
            description: wholeJob
              ? t('photos.emptyDuringWholeJob')
              : t('photos.emptyDuringNamed', { name: title }),
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
            {reorderMode ? (
              <TextButton
                label={t('photos.done')}
                onPress={() => {
                  setReorderMode(false);
                  setReorderingDrag(false);
                }}
              />
            ) : null}
            {reorderMode ? null : (
              <IconButton
                name="resize-outline"
                accessibilityLabel={t('arTools.openA11y')}
                onPress={() => router.push({ pathname: '/job/[id]/measure', params: { id, areaId } })}
              />
            )}
            {wholeJob ? null : (
              <IconButton name="ellipsis-horizontal" accessibilityLabel={t('photos.sectionOptionsA11y')} onPress={() => setMenuOpen(true)} />
            )}
          </View>
        }
      />

      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        <SegmentedControl
          segments={[
            { key: 'before', label: t('photos.beforeCount', { count: before.photos.length }) },
            { key: 'during', label: t('photos.duringCount', { count: during.photos.length }) },
            { key: 'after', label: t('photos.afterCount', { count: after.photos.length }) },
          ]}
          value={type}
          onChange={(key) => {
            setReorderMode(false);
            setType(key as PhotoType);
          }}
        />
        {active.photos.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
            <Text variant="bodyMedium" color={colors.textPrimary} style={{ flexShrink: 1 }}>
              {t('photos.viewLayoutTitle')}
            </Text>
            <SegmentedControl
              iconsOnly
              segments={[
                { key: 'fullWidth', label: t('photos.layoutFullWidth'), icon: 'square-outline' },
                { key: 'compact', label: t('photos.layoutCompact'), icon: 'grid-outline' },
              ]}
              value={browseLayout}
              onChange={(key) => {
                const next = normalizePhotoBrowseLayout(key);
                setBrowseLayout(next);
                void savePreferences({ photoBrowseLayout: next });
              }}
            />
          </View>
        ) : null}
      </View>

      {error || active.error ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <Text variant="bodySmall" color={colors.destructive}>
            {error ?? active.error}
          </Text>
        </View>
      ) : null}

      <ScrollView
        scrollEnabled={!reorderingDrag}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
      >
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
            layout={browseLayout}
            reorderMode={reorderMode}
            onReorder={handleReorder}
            onDraggingChange={setReorderingDrag}
            onPressPhoto={(photo) => {
              if (reorderMode) return;
              router.push(`/job/${id}/photo/${photo.id}`);
            }}
            onLongPressPhoto={() => {
              if (reorderMode) return;
              setReorderMode(true);
              showToast({ message: t('photos.reorderHint'), tone: 'neutral' });
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
              onPress={openCamera}
              loading={processing || savingCapture}
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
        onTakePhoto={openCamera}
        onChooseFromLibrary={() => capture('library')}
        label={type}
      />

      <PhotoCaptureAnnotateModal
        visible={cameraOpen}
        type={type}
        onClose={() => setCameraOpen(false)}
        onSave={saveCapturedPhoto}
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

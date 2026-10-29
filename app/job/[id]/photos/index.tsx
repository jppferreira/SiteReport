import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  Button,
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  NavigationHeader,
  Screen,
  Skeleton,
  Text,
  TextButton,
  useToast,
} from '@/components';
import { photoAreasRepository } from '@/database';
import { AreaNameDialog } from '@/features/photos/AreaNameDialog';
import { AreaRow } from '@/features/photos/AreaRow';
import { BottomSheetMenu } from '@/features/jobs/BottomSheetMenu';
import { useJobPhotos } from '@/hooks/usePhotos';
import { usePhotoAreas } from '@/hooks/usePhotoAreas';
import { Photo, PhotoArea, WHOLE_JOB_AREA_ID } from '@/models';
import { deleteFileSafely } from '@/services/fileService';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { goBack } from '@/utils/goBack';

type NameDraft = {
  key: string;
  mode: 'create' | 'rename';
  areaId?: string;
  name: string;
};

export default function PhotoSectionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const areasState = usePhotoAreas(id);
  const photosState = useJobPhotos(id);
  const refreshAreas = areasState.refresh;
  const refreshPhotos = photosState.refresh;
  const [draft, setDraft] = useState<NameDraft | null>(null);
  const [moveExisting, setMoveExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuArea, setMenuArea] = useState<PhotoArea | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<PhotoArea | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(() => {
    refreshAreas();
    refreshPhotos();
  }, [refreshAreas, refreshPhotos]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const unassigned = photosState.photos.filter((photo) => photo.areaId == null);
  const loading = areasState.loading || photosState.loading;
  const empty = !loading && areasState.areas.length === 0 && photosState.photos.length === 0;

  const openCreate = () => {
    setMoveExisting(unassigned.length > 0 && areasState.areas.length === 0);
    setDraft({ key: `create-${Date.now()}`, mode: 'create', name: '' });
  };

  const openArea = (areaId: string) => {
    router.push(`/job/${id}/photos/${areaId}`);
  };

  const handleSubmitName = async (name: string) => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      if (draft.mode === 'create') {
        const created = await photoAreasRepository.addArea(id, name);
        if (!created) return;
        if (moveExisting && unassigned.length > 0) {
          await photoAreasRepository.claimUnassignedPhotos(id, created.id);
        }
        setDraft(null);
        router.push(`/job/${id}/photos/${created.id}`);
        return;
      }
      if (draft.areaId) {
        const renamed = await photoAreasRepository.renameArea(draft.areaId, name);
        if (!renamed) return;
        setDraft(null);
        areasState.refresh();
      }
    } catch {
      showToast({ message: t('photos.toastSectionSavedError'), tone: 'neutral' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!areaToDelete) return;
    setDeleting(true);
    try {
      const photos = await photoAreasRepository.deleteArea(areaToDelete.id);
      await Promise.all(photos.flatMap((photo) => [deleteFileSafely(photo.localUri), deleteFileSafely(photo.thumbnailUri)]));
      showToast({ message: t('photos.toastSectionDeleted'), tone: 'neutral' });
      setAreaToDelete(null);
      refresh();
    } catch {
      showToast({ message: t('photos.toastSectionDeleteError'), tone: 'neutral' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen>
      <NavigationHeader title={t('photos.title')} onBack={() => goBack(`/job/${id}`)} />

      {areasState.error || photosState.error ? (
        <ErrorState
          title={t('photos.errorLoad')}
          description={areasState.error ?? photosState.error ?? undefined}
          onAction={refresh}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1, paddingTop: 0 }}>
          {loading ? (
            <View style={{ gap: spacing.sm }}>
              <Skeleton height={72} radius={16} />
              <Skeleton height={72} radius={16} />
            </View>
          ) : empty ? (
            <View style={{ flex: 1, justifyContent: 'center', gap: spacing.md }}>
              <EmptyState
                icon="albums-outline"
                title={t('photos.emptyTitle')}
                description={t('photos.emptyDescription')}
                actionLabel={t('photos.addSection')}
                onAction={openCreate}
              />
              <TextButton label={t('photos.addWholeJob')} onPress={() => openArea(WHOLE_JOB_AREA_ID)} />
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              <Text variant="body" color={colors.textSecondary}>
                {t('photos.listHint')}
              </Text>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: 'hidden',
                }}
              >
                {areasState.areas.map((area, index) => {
                  const photos = photosInArea(photosState.photos, area.id);
                  const lastNamed = index === areasState.areas.length - 1 && unassigned.length === 0;
                  return (
                    <AreaRow
                      key={area.id}
                      title={area.name}
                      subtitle={photoSummary(t, photos)}
                      photos={photos}
                      showDivider={!lastNamed}
                      onPress={() => openArea(area.id)}
                      onMenu={() => setMenuArea(area)}
                    />
                  );
                })}
                {unassigned.length > 0 ? (
                  <AreaRow
                    title={areasState.areas.length > 0 ? t('photos.otherPhotos') : t('photos.wholeJob')}
                    subtitle={photoSummary(t, unassigned)}
                    photos={photosInArea(photosState.photos, null)}
                    onPress={() => openArea(WHOLE_JOB_AREA_ID)}
                  />
                ) : null}
              </View>
              {unassigned.length === 0 ? (
                <TextButton label={t('photos.addWholeJob')} onPress={() => openArea(WHOLE_JOB_AREA_ID)} />
              ) : null}
            </View>
          )}
        </ScrollView>
      )}

      {!loading && !empty && !areasState.error && !photosState.error ? (
        <View style={{ padding: spacing.lg, paddingTop: 0 }}>
          <Button label={t('photos.addSection')} onPress={openCreate} />
        </View>
      ) : null}

      {draft ? (
        <AreaNameDialog
          key={draft.key}
          visible
          title={draft.mode === 'create' ? t('photos.newSection') : t('photos.renameSection')}
          confirmLabel={draft.mode === 'create' ? t('photos.addSection') : t('common.save')}
          initialName={draft.name}
          saving={saving}
          moveExisting={
            draft.mode === 'create' && unassigned.length > 0
              ? { count: unassigned.length, value: moveExisting, onChange: setMoveExisting }
              : null
          }
          onCancel={() => {
            if (!saving) setDraft(null);
          }}
          onSubmit={handleSubmitName}
        />
      ) : null}

      <BottomSheetMenu
        visible={menuArea !== null}
        onClose={() => setMenuArea(null)}
        items={[
          {
            icon: 'create-outline',
            label: t('photos.renameSection'),
            onPress: () => {
              if (!menuArea) return;
              setDraft({ key: `rename-${menuArea.id}-${Date.now()}`, mode: 'rename', areaId: menuArea.id, name: menuArea.name });
            },
          },
          {
            icon: 'trash-outline',
            label: t('photos.deleteSection'),
            destructive: true,
            onPress: () => {
              if (!menuArea) return;
              setAreaToDelete(menuArea);
            },
          },
        ]}
      />

      <ConfirmationDialog
        visible={areaToDelete !== null}
        title={areaToDelete ? t('photos.deleteSectionTitleNamed', { name: areaToDelete.name }) : t('photos.deleteSectionTitle')}
        description={t('photos.deleteSectionDescription')}
        confirmLabel={t('photos.deleteSectionConfirm')}
        onConfirm={handleDelete}
        onCancel={() => setAreaToDelete(null)}
        loading={deleting}
      />
    </Screen>
  );
}

function photosInArea(photos: Photo[], areaId: string | null): Photo[] {
  return photos
    .filter((photo) => (photo.areaId ?? null) === areaId)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'before' ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
}

type Translate = (key: string, options?: Record<string, string | number>) => string;

function photoSummary(t: Translate, photos: Photo[]): string {
  const before = photos.filter((photo) => photo.type === 'before').length;
  const after = photos.filter((photo) => photo.type === 'after').length;
  if (before === 0 && after === 0) return t('photos.summaryEmpty');
  const parts: string[] = [];
  if (before > 0) {
    parts.push(before === 1 ? t('photos.summaryOneBefore') : t('photos.summaryBeforeCount', { count: before }));
  }
  if (after > 0) {
    parts.push(after === 1 ? t('photos.summaryOneAfter') : t('photos.summaryAfterCount', { count: after }));
  }
  if (parts.length === 2) {
    return t('photos.summaryJoin', { before: parts[0]!, after: parts[1]! });
  }
  return parts[0] ?? '';
}

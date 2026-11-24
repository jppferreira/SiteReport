import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  LocalImage,
  NavigationHeader,
  PermissionNotice,
  Screen,
  Text,
  TextButton,
} from '@/components';
import { photoAreasRepository, photosRepository } from '@/database';
import { AreaNameDialog } from '@/features/photos/AreaNameDialog';
import {
  CapturedAnnotateResult,
  PhotoCaptureAnnotateModal,
} from '@/features/photos/PhotoCaptureAnnotateModal';
import { PhotoCaptureSheet } from '@/features/photos/PhotoCaptureSheet';
import { usePhotoCapture } from '@/hooks/usePhotoCapture';
import { useI18n } from '@/i18n/useI18n';
import { Photo, PhotoArea, PhotoType, WHOLE_JOB_AREA_ID } from '@/models';
import { processJobPhoto } from '@/services/imageService';
import { resolveTakenAt } from '@/services/photoTakenAt';
import { getPreferences } from '@/services/preferencesService';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';
import { generateId } from '@/utils/id';
import { goBack } from '@/utils/goBack';

type PhotosToolsScreenProps = {
  jobId: string;
};

type StageKey = 'before' | 'during' | 'after';

/** Figma 05 — Photos & site tools (full screen from the guided flow). */
export function PhotosToolsScreen({ jobId }: PhotosToolsScreenProps) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [areas, setAreas] = useState<PhotoArea[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [savingArea, setSavingArea] = useState(false);
  const [captureType, setCaptureType] = useState<PhotoType>('after');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [savingCapture, setSavingCapture] = useState(false);

  const refresh = useCallback(async () => {
    const [nextAreas, nextPhotos] = await Promise.all([
      photoAreasRepository.listAreas(jobId),
      photosRepository.listPhotos(jobId),
    ]);
    setAreas(nextAreas);
    setPhotos(nextPhotos);
    setSelectedAreaId((current) => {
      if (current && (current === WHOLE_JOB_AREA_ID || nextAreas.some((a) => a.id === current))) {
        return current;
      }
      return nextAreas[0]?.id ?? WHOLE_JOB_AREA_ID;
    });
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const areaFilterId = selectedAreaId === WHOLE_JOB_AREA_ID ? null : selectedAreaId;
  const areaPhotos = useMemo(
    () => photos.filter((p) => (areaFilterId == null ? p.areaId == null : p.areaId === areaFilterId)),
    [photos, areaFilterId]
  );
  const byStage = useMemo(() => {
    const groups: Record<StageKey, Photo[]> = { before: [], during: [], after: [] };
    for (const photo of areaPhotos) {
      groups[photo.type].push(photo);
    }
    return groups;
  }, [areaPhotos]);

  const measureCount = useMemo(
    () => photos.filter((p) => /m\b|cm\b|mm\b|ft|in\b|\d+\.\d+\s*m/i.test(p.caption ?? '')).length,
    [photos]
  );
  const levelChip = useMemo(() => {
    for (const photo of photos) {
      const match = (photo.caption ?? '').match(/(-?\d+(?:\.\d+)?)\s*°/);
      if (match) return t('jobDetail.guided.sheet.levelChip', { degrees: match[1] });
      if (/level/i.test(photo.caption ?? '')) return t('jobDetail.guided.levelChecked');
    }
    return null;
  }, [photos, t]);

  const {
    capture,
    processing,
    permissionDenied,
    clearPermissionDenied,
  } = usePhotoCapture(jobId, captureType, areaFilterId, () => {
    void refresh();
  });

  const openCapture = (type: PhotoType, source: 'sheet' | 'camera' | 'library' = 'sheet') => {
    setCaptureType(type);
    if (source === 'sheet') {
      setSheetOpen(true);
      return;
    }
    if (source === 'camera') {
      setCameraOpen(true);
      return;
    }
    void capture('library');
  };

  const saveCapturedPhoto = async (result: CapturedAnnotateResult) => {
    setSavingCapture(true);
    try {
      const photoId = generateId();
      const { defaultPhotoQuality } = await getPreferences();
      const processed = await processJobPhoto(
        jobId,
        photoId,
        result.uri,
        result.width,
        result.height,
        defaultPhotoQuality
      );
      await photosRepository.addPhoto({
        jobId,
        areaId: areaFilterId,
        type: captureType,
        localUri: processed.localUri,
        thumbnailUri: processed.thumbnailUri,
        caption: null,
        width: processed.width,
        height: processed.height,
        takenAt: resolveTakenAt({
          source: 'camera',
          exif: null,
          capturedAt: new Date().toISOString(),
        }),
        annotations: result.annotations,
      });
      setCameraOpen(false);
      await refresh();
    } finally {
      setSavingCapture(false);
    }
  };

  const handleCreateArea = async (name: string) => {
    if (savingArea) return;
    setSavingArea(true);
    try {
      const created = await photoAreasRepository.addArea(jobId, name);
      if (!created) return;
      setCreateOpen(false);
      setSelectedAreaId(created.id);
      await refresh();
    } finally {
      setSavingArea(false);
    }
  };

  const primaryType: PhotoType =
    byStage.after.length === 0 && byStage.before.length + byStage.during.length > 0 ? 'after' : 'before';
  const primaryCta =
    primaryType === 'after' ? t('jobDetail.guided.sheet.takeAfterPhotos') : t('photos.captureTakePhoto');

  return (
    <Screen>
      <NavigationHeader
        title={t('photos.title')}
        subtitle={t('jobDetail.guided.sheet.stepOfShort', { step: 2, total: 7 })}
        onBack={() => goBack(`/job/${jobId}`)}
        right={<TextButton label={t('edit.done')} onPress={() => goBack(`/job/${jobId}`)} tone="accent" />}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: spacing.xl, gap: 16 }}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.areaTabs}>
          {areas.length === 0 ? (
            <AreaChip
              label={t('photos.wholeJob')}
              count={photos.length}
              selected
              onPress={() => setSelectedAreaId(WHOLE_JOB_AREA_ID)}
            />
          ) : (
            areas.map((area) => {
              const count = photos.filter((p) => p.areaId === area.id).length;
              return (
                <AreaChip
                  key={area.id}
                  label={area.name}
                  count={count}
                  selected={selectedAreaId === area.id}
                  onPress={() => setSelectedAreaId(area.id)}
                />
              );
            })
          )}
          <Pressable
            onPress={() => setCreateOpen(true)}
            style={[
              styles.areaChip,
              { backgroundColor: colors.surface, borderColor: colors.borderStrong, borderWidth: 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('photos.addSection')}
          >
            <Ionicons name="add" size={13} color={colors.accent} />
            <Text variant="caption" color={colors.accent} style={{ fontFamily: fontFamily.semibold, fontSize: 13 }}>
              {t('jobDetail.guided.sheet.section')}
            </Text>
          </Pressable>
        </ScrollView>

        <View style={{ gap: 8 }}>
          <View style={styles.siteToolsLabel}>
            <Text
              variant="caption"
              color={colors.textTertiary}
              style={{ fontFamily: fontFamily.semibold, letterSpacing: 0.88, fontSize: 11 }}
            >
              {t('jobDetail.guided.sheet.siteTools')}
            </Text>
            <Text variant="caption" color={colors.textTertiary} style={{ fontSize: 11 }}>
              {t('jobDetail.guided.sheet.savedPhotosLand')}
            </Text>
          </View>
          <View style={styles.toolsRow}>
            <ToolCard
              icon="resize-outline"
              title={t('jobDetail.guided.measure')}
              subtitle={t('jobDetail.guided.sheet.measureSub')}
              chip={
                measureCount > 0 ? t('jobDetail.guided.sheet.savedCount', { count: measureCount }) : null
              }
              onPress={() => router.push(`/job/${jobId}/measure`)}
            />
            <ToolCard
              icon="phone-landscape-outline"
              title={t('jobDetail.guided.steps.level.title')}
              subtitle={t('jobDetail.guided.sheet.levelSub')}
              chip={levelChip}
              onPress={() => router.push(`/job/${jobId}/measure?mode=level`)}
            />
          </View>
        </View>

        <StageBlock
          title={t('photos.stageBefore')}
          photos={byStage.before}
          complete={byStage.before.length > 0}
          onAdd={() => openCapture('before')}
          onOpenPhoto={(id) => router.push(`/job/${jobId}/photo/${id}`)}
        />
        <StageBlock
          title={t('photos.stageDuring')}
          photos={byStage.during}
          complete={byStage.during.length > 0}
          onAdd={() => openCapture('during')}
          onOpenPhoto={(id) => router.push(`/job/${jobId}/photo/${id}`)}
        />
        <StageBlock
          title={t('photos.stageAfter')}
          photos={byStage.after}
          complete={byStage.after.length > 0}
          emptyHint
          onAdd={() => openCapture('after')}
          onOpenPhoto={(id) => router.push(`/job/${jobId}/photo/${id}`)}
        />
      </ScrollView>

      <View
        style={[
          styles.stickyBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <View style={styles.stickyActions}>
          <Pressable
            onPress={() => openCapture(primaryType, 'library')}
            disabled={processing || savingCapture}
            style={[styles.galleryBtn, { borderColor: colors.borderStrong }]}
            accessibilityRole="button"
            accessibilityLabel={t('photos.captureChoosePhotos')}
          >
            <Ionicons name="image-outline" size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() => openCapture(primaryType, 'camera')}
            disabled={processing || savingCapture}
            style={[styles.primaryBtn, { backgroundColor: colors.ctaDark }]}
            accessibilityRole="button"
          >
            <Ionicons name="camera-outline" size={18} color={colors.textInverse} />
            <Text variant="body" color={colors.textInverse} style={{ fontFamily: fontFamily.semibold, fontSize: 15 }}>
              {primaryCta}
            </Text>
          </Pressable>
        </View>
      </View>

      <PermissionNotice
        visible={permissionDenied !== null}
        kind={permissionDenied ?? 'camera'}
        onDismiss={clearPermissionDenied}
      />

      <PhotoCaptureSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        label={
          captureType === 'before'
            ? t('photos.stageBefore')
            : captureType === 'during'
              ? t('photos.stageDuring')
              : t('photos.stageAfter')
        }
        onTakePhoto={() => {
          setSheetOpen(false);
          setCameraOpen(true);
        }}
        onChooseFromLibrary={() => {
          setSheetOpen(false);
          void capture('library');
        }}
      />

      <PhotoCaptureAnnotateModal
        visible={cameraOpen}
        type={captureType}
        onClose={() => setCameraOpen(false)}
        onSave={(result) => void saveCapturedPhoto(result)}
      />

      <AreaNameDialog
        visible={createOpen}
        title={t('photos.newSection')}
        confirmLabel={t('common.save')}
        initialName=""
        saving={savingArea}
        onCancel={() => {
          if (!savingArea) setCreateOpen(false);
        }}
        onSubmit={(name) => void handleCreateArea(name)}
      />
    </Screen>
  );
}

function AreaChip({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.areaChip,
        selected
          ? { backgroundColor: colors.ctaDark }
          : { backgroundColor: colors.surface, borderColor: colors.borderStrong, borderWidth: 1 },
      ]}
    >
      <Text
        variant="caption"
        color={selected ? colors.textInverse : colors.textPrimary}
        style={{ fontFamily: selected ? fontFamily.semibold : fontFamily.medium, fontSize: 13 }}
      >
        {`${label} · ${count}`}
      </Text>
    </Pressable>
  );
}

function ToolCard({
  icon,
  title,
  subtitle,
  chip,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  chip: string | null;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.toolCard, { backgroundColor: colors.ctaDark }]} accessibilityRole="button">
      <View style={styles.toolTop}>
        <View style={[styles.toolIcon, { backgroundColor: '#2A2E2A' }]}>
          <Ionicons name={icon} size={18} color={colors.textInverse} />
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
      <View style={{ gap: 2 }}>
        <Text variant="body" color={colors.textInverse} style={{ fontFamily: fontFamily.semibold, fontSize: 15 }}>
          {title}
        </Text>
        <Text variant="caption" style={{ color: '#A7B0AA', fontSize: 11 }}>
          {subtitle}
        </Text>
      </View>
      {chip ? (
        <View style={[styles.toolChip, { backgroundColor: '#1F3A27' }]}>
          <Ionicons name="checkmark" size={12} color="#6FE08F" />
          <Text variant="caption" style={{ color: '#6FE08F', fontFamily: fontFamily.semibold, fontSize: 10 }}>
            {chip}
          </Text>
        </View>
      ) : (
        <View style={{ height: 20 }} />
      )}
    </Pressable>
  );
}

function StageBlock({
  title,
  photos,
  complete,
  emptyHint,
  onAdd,
  onOpenPhoto,
}: {
  title: string;
  photos: Photo[];
  complete: boolean;
  emptyHint?: boolean;
  onAdd: () => void;
  onOpenPhoto: (id: string) => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const preview = photos.slice(0, 3);
  const overflow = Math.max(0, photos.length - 3);

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.stageHead}>
        <View style={styles.stageLeft}>
          {complete ? (
            <View style={[styles.stageOk, { backgroundColor: colors.accent }]}>
              <Ionicons name="checkmark" size={11} color={colors.textInverse} />
            </View>
          ) : (
            <View style={[styles.stageTodo, { borderColor: '#E8A317' }]} />
          )}
          <Text variant="body" style={{ fontFamily: fontFamily.semibold, fontSize: 15 }}>
            {title}
          </Text>
          <View style={[styles.countChip, { backgroundColor: colors.surfaceSunken }]}>
            <Text variant="caption" color={colors.textSecondary} style={{ fontFamily: fontFamily.semibold, fontSize: 10 }}>
              {photos.length}
            </Text>
          </View>
        </View>
        <Pressable onPress={onAdd} style={styles.addRow} accessibilityRole="button">
          <Ionicons name="add" size={14} color={colors.accent} />
          <Text variant="caption" color={colors.accent} style={{ fontFamily: fontFamily.semibold, fontSize: 13 }}>
            {t('jobDetail.guided.sheet.add')}
          </Text>
        </Pressable>
      </View>

      {photos.length === 0 && emptyHint ? (
        <View style={[styles.emptyAfter, { backgroundColor: '#FFF4DB', borderColor: '#E8A317' }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="scan-outline" size={20} color={colors.textSecondary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="body" style={{ fontFamily: fontFamily.semibold, fontSize: 14 }}>
              {t('jobDetail.guided.sheet.noAfterYet')}
            </Text>
            <Text variant="caption" color={colors.textSecondary} style={{ fontSize: 12, lineHeight: 16 }}>
              {t('jobDetail.guided.sheet.ghostGuide')}
            </Text>
          </View>
        </View>
      ) : photos.length > 0 ? (
        <View style={styles.thumbRow}>
          {preview.map((photo, index) => {
            const uri = photo.thumbnailUri || photo.localUri;
            const isLast = index === preview.length - 1 && overflow > 0;
            const badge = photoBadge(photo.caption);
            return (
              <Pressable
                key={photo.id}
                onPress={() => onOpenPhoto(photo.id)}
                style={styles.thumb}
                accessibilityRole="button"
              >
                <LocalImage uri={uri} style={StyleSheet.absoluteFill} />
                {badge && !isLast ? (
                  <View style={[styles.photoBadge, { backgroundColor: colors.ctaDark }]}>
                    <Ionicons name={badge.icon} size={12} color={colors.textInverse} />
                    <Text
                      variant="caption"
                      color={colors.textInverse}
                      style={{ fontFamily: fontFamily.semibold, fontSize: 10 }}
                    >
                      {badge.label}
                    </Text>
                  </View>
                ) : null}
                {isLast ? (
                  <View style={[StyleSheet.absoluteFill, styles.moreOverlay]}>
                    <Text
                      variant="body"
                      color={colors.textInverse}
                      style={{ fontFamily: fontFamily.semibold, fontSize: 18 }}
                    >
                      {`+${overflow}`}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function photoBadge(caption: string | null): { icon: keyof typeof Ionicons.glyphMap; label: string } | null {
  if (!caption) return null;
  const level = caption.match(/(-?\d+(?:\.\d+)?)\s*°/);
  if (level) return { icon: 'phone-landscape-outline', label: `Level ${level[1]}°` };
  const measure = caption.match(/(\d+(?:\.\d+)?)\s*(m|cm|mm)\b/i);
  if (measure) return { icon: 'resize-outline', label: `${measure[1]} ${measure[2]}` };
  return null;
}

const styles = StyleSheet.create({
  areaTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  siteToolsLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toolCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  toolTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  stageHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stageOk: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageTodo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  countChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: 7,
  },
  thumb: {
    width: 113,
    height: 86,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 6,
  },
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  moreOverlay: {
    backgroundColor: 'rgba(18,20,18,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAfter: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  stickyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  galleryBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  primaryBtn: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
});

import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { LoadingState, Screen, useToast } from '@/components';
import { jobsRepository, photoAreasRepository, photosRepository } from '@/database';
import { jobMeasurementsFromPhotos } from '@/features/photos/jobMeasurementsFromPhotos';
import { PhotoAnnotationEditor } from '@/features/photos/PhotoAnnotationEditor';
import { PhotoMarkupSaveSheet, stageLabelForType } from '@/features/photos/PhotoMarkupSaveSheet';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useI18n } from '@/i18n/useI18n';
import { captionFromAnnotations, emptyAnnotations, Photo, PhotoAnnotations } from '@/models';
import { formatStampDateTime } from '@/services/evidenceStamp';
import { getPreferences, savePreferences } from '@/services/preferencesService';

function formatStageTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function PhotoAnnotateScreen() {
  const { id, photoId } = useLocalSearchParams<{ id: string; photoId: string }>();
  const { t } = useI18n();
  const { isPro, loading: entitlementLoading } = useEntitlement();
  const { showToast } = useToast();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [jobAddress, setJobAddress] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [stampEnabled, setStampEnabled] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [jobMeasurements, setJobMeasurements] = useState<
    ReturnType<typeof jobMeasurementsFromPhotos>
  >([]);
  const annotationsRef = useRef<PhotoAnnotations>(emptyAnnotations());
  const initialSerialized = useRef<string | null>(null);

  useEffect(() => {
    if (entitlementLoading) return;
    if (!isPro) {
      router.replace({ pathname: '/paywall', params: { trigger: 'photo_markup' } });
      return;
    }
    photosRepository.getPhoto(photoId).then((next) => {
      setPhoto(next);
      setCaption(next?.caption ?? '');
      annotationsRef.current = next?.annotations ?? emptyAnnotations();
      initialSerialized.current = JSON.stringify(annotationsRef.current.shapes);
      if (next?.areaId) {
        photoAreasRepository.getArea(next.areaId).then((area) => setAreaName(area?.name ?? null));
      } else {
        setAreaName(t('photos.wholeJob'));
      }
    });
    jobsRepository.getJob(id).then((job) => {
      setJobTitle(job?.title ?? null);
      setJobAddress(job?.address ?? null);
    });
    photosRepository.listPhotos(id).then((all) => {
      setJobMeasurements(jobMeasurementsFromPhotos(all));
    });
    getPreferences().then((prefs) => {
      setStampEnabled(prefs.stampDateTime || prefs.stampAddress);
    });
  }, [photoId, t, isPro, entitlementLoading, id]);

  const stageBadge = useMemo(() => {
    if (!photo) return null;
    const area = areaName ?? t('photos.wholeJob');
    const stage = stageLabelForType(photo.type, t);
    const time = formatStageTime(photo.takenAt ?? photo.createdAt);
    return time ? `${area} · ${stage} ${time}` : `${area} · ${stage}`;
  }, [photo, areaName, t]);

  const sectionLabel = useMemo(() => {
    if (!photo) return '';
    const area = areaName ?? t('photos.wholeJob');
    return `${area} · ${stageLabelForType(photo.type, t)}`;
  }, [photo, areaName, t]);

  const persist = useCallback(async () => {
    if (!photo || saving) return;
    setSaving(true);
    try {
      const marks = annotationsRef.current;
      const nextCaption =
        caption.trim() || captionFromAnnotations(marks) || photo.caption || null;
      await photosRepository.updatePhoto(photo.id, {
        annotations: marks,
        caption: nextCaption,
      });
      await savePreferences({
        stampDateTime: stampEnabled,
        stampAddress: stampEnabled,
        stampShowOnPdf: stampEnabled,
      });
      setDirty(false);
      initialSerialized.current = JSON.stringify(marks.shapes);
      setSaveOpen(false);
      showToast({
        message: t('photoAnnotate.toastSavedSection', { section: sectionLabel }),
        tone: 'success',
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }, [photo, saving, caption, stampEnabled, showToast, t, sectionLabel, id]);

  usePreventRemove(dirty && !saveOpen, ({ repeat }) => {
    const count = annotationsRef.current.shapes.length;
    Alert.alert(t('photoAnnotate.unsavedTitle'), t('photoAnnotate.unsavedBody', { count }), [
      { text: t('photoAnnotate.unsavedKeep'), style: 'cancel' },
      {
        text: t('photoAnnotate.unsavedDiscard'),
        style: 'destructive',
        onPress: () => {
          setDirty(false);
          repeat();
        },
      },
      {
        text: t('photoAnnotate.unsavedSave'),
        onPress: () => setSaveOpen(true),
      },
    ]);
  });

  if (!photo) {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']} style={styles.dark}>
        <LoadingState />
      </Screen>
    );
  }

  const stampSample = formatStampDateTime(photo.takenAt ?? photo.createdAt);
  const stampLine = [jobAddress, stampSample].filter(Boolean).join(' · ');

  return (
    <View style={styles.root}>
      <PhotoAnnotationEditor
        uri={photo.localUri}
        photoWidth={photo.width}
        photoHeight={photo.height}
        initial={photo.annotations}
        stageBadge={stageBadge}
        jobMeasurements={jobMeasurements}
        onClose={() => router.back()}
        onSave={() => {
          if (!caption.trim()) {
            const suggested = captionFromAnnotations(annotationsRef.current);
            if (suggested) setCaption(suggested);
          }
          setSaveOpen(true);
        }}
        saveLoading={saving}
        onChange={(next) => {
          annotationsRef.current = next;
          const serialized = JSON.stringify(next.shapes);
          setDirty(serialized !== initialSerialized.current);
        }}
      />

      <PhotoMarkupSaveSheet
        visible={saveOpen}
        onClose={() => setSaveOpen(false)}
        uri={photo.localUri}
        photoWidth={photo.width}
        photoHeight={photo.height}
        annotations={annotationsRef.current}
        caption={caption}
        onCaptionChange={setCaption}
        stageLabel={`${stageLabelForType(photo.type, t)}${formatStageTime(photo.takenAt ?? photo.createdAt) ? ` · ${formatStageTime(photo.takenAt ?? photo.createdAt)}` : ''}`}
        sectionLabel={sectionLabel}
        jobSubtitle={[jobTitle, jobAddress].filter(Boolean).join(' · ') || null}
        stampEnabled={stampEnabled}
        onStampChange={setStampEnabled}
        stampSample={stampLine || null}
        saving={saving}
        onSave={persist}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#121412' },
  dark: { backgroundColor: '#121412' },
});

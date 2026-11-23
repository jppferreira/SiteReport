import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { emptyAnnotations, PhotoAnnotations, PhotoType } from '@/models';
import { useTheme } from '@/theme';

import { PhotoAnnotationEditor } from './PhotoAnnotationEditor';

export type CapturedAnnotateResult = {
  uri: string;
  width: number;
  height: number;
  annotations: PhotoAnnotations;
};

type PhotoCaptureAnnotateModalProps = {
  visible: boolean;
  type: PhotoType;
  onClose: () => void;
  onSave: (result: CapturedAnnotateResult) => Promise<void> | void;
};

type Snapshot = {
  uri: string;
  width: number;
  height: number;
};

/**
 * Full-screen take-and-annotate flow: live camera on top, annotation cards
 * and tools underneath. After the shutter fires, the same modal freezes on
 * the still so the user can mark it up without leaving.
 */
export function PhotoCaptureAnnotateModal({ visible, type, onClose, onSave }: PhotoCaptureAnnotateModalProps) {
  const { spacing } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [annotations, setAnnotations] = useState<PhotoAnnotations>(emptyAnnotations());
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;

  useEffect(() => {
    if (!visible) return;
    setSnapshot(null);
    setAnnotations(emptyAnnotations());
    annotationsRef.current = emptyAnnotations();
  }, [visible]);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const takePicture = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: false,
        exif: false,
      });
      if (!photo?.uri) return;
      setSnapshot({
        uri: photo.uri,
        width: photo.width || 1600,
        height: photo.height || 1200,
      });
      setAnnotations(emptyAnnotations());
      annotationsRef.current = emptyAnnotations();
    } finally {
      setBusy(false);
    }
  };

  const retake = () => {
    setSnapshot(null);
    setAnnotations(emptyAnnotations());
    annotationsRef.current = emptyAnnotations();
  };

  const save = async () => {
    if (!snapshot || saving) return;
    setSaving(true);
    try {
      await onSave({
        uri: snapshot.uri,
        width: snapshot.width,
        height: snapshot.height,
        annotations: annotationsRef.current,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
          <IconButton
            name="close"
            accessibilityLabel={t('photoAnnotate.closeA11y')}
            variant="ghost"
            color="#FFFFFF"
            onPress={onClose}
          />
          <Text variant="bodyMedium" color="#FFFFFF">
            {type === 'before'
              ? t('photoDetail.beforeBadge')
              : type === 'during'
                ? t('photoDetail.duringBadge')
                : t('photoDetail.afterBadge')}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.stage}>
          {snapshot ? (
            <View style={[styles.annotatePane, { paddingHorizontal: spacing.md }]}>
              <PhotoAnnotationEditor
                key={snapshot.uri}
                uri={snapshot.uri}
                photoWidth={snapshot.width}
                photoHeight={snapshot.height}
                initial={annotations}
                stageBadge={
                  type === 'before'
                    ? t('photos.stageBefore')
                    : type === 'during'
                      ? t('photos.stageDuring')
                      : t('photos.stageAfter')
                }
                onDone={save}
                doneLoading={saving}
                onChange={(next) => {
                  annotationsRef.current = next;
                  setAnnotations(next);
                }}
              />
              <View style={{ paddingVertical: spacing.sm }}>
                <Button label={t('photoAnnotate.retake')} variant="secondary" onPress={retake} disabled={saving} />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.cameraWrap}>
                {!permission ? (
                  <View style={styles.centered}>
                    <ActivityIndicator color="#FFFFFF" />
                  </View>
                ) : !permission.granted ? (
                  <View style={[styles.centered, { padding: spacing.lg, gap: spacing.md }]}>
                    <Text variant="body" color="#FFFFFF" style={{ textAlign: 'center' }}>
                      {t('photoAnnotate.cameraPermission')}
                    </Text>
                    <Button label={t('photoAnnotate.cameraPermissionAction')} onPress={requestPermission} />
                  </View>
                ) : (
                  <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mode="picture" />
                )}

                {permission?.granted ? (
                  <View style={[styles.cameraControls, { paddingBottom: spacing.md }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('photoAnnotate.flipCameraA11y')}
                      onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
                      style={styles.flipButton}
                    >
                      <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('photoAnnotate.shutterA11y')}
                      disabled={busy}
                      onPress={takePicture}
                      style={[styles.shutter, busy ? { opacity: 0.5 } : null]}
                    >
                      <View style={styles.shutterInner} />
                    </Pressable>
                    <View style={{ width: 44 }} />
                  </View>
                ) : null}
              </View>

              <View style={[styles.liveCards, { padding: spacing.lg }]}>
                <Text variant="bodyMedium" color="#FFFFFF" style={{ marginBottom: spacing.xs }}>
                  {t('photoAnnotate.liveCardsTitle')}
                </Text>
                <Text variant="caption" color="rgba(255,255,255,0.6)">
                  {t('photoAnnotate.liveCardsHint')}
                </Text>
              </View>
            </>
          )}
        </View>

      </View>
    </Modal>
  );
}

/** Preview helper kept for tests / future still-frame overlays. */
export function SnapshotPreview({ uri }: { uri: string }) {
  return <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#101310',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stage: {
    flex: 1,
    minHeight: 0,
  },
  annotatePane: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#F4F8F5',
    paddingTop: 4,
  },
  cameraWrap: {
    flex: 1.35,
    minHeight: 220,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  liveCards: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    minHeight: 120,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
});

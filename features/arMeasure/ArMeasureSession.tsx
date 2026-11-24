import { Ionicons } from '@expo/vector-icons';
import { ExpoArView } from '@stewmore/expo-ar';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { Button, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { getPreferences, savePreferences, type MeasureUnit } from '@/services/preferencesService';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import type { ArViewHandle, Capabilities, ProjectedPoint, TrackingState } from './arTypes';
import { formatLength } from './formatLength';
import { saveMeasurementPhoto } from './saveMeasurementPhoto';
import { useArMeasureSession } from './useArMeasureSession';

type ArMeasureSessionProps = {
  jobId: string;
  areaId: string | null;
  capabilities: Capabilities;
  onClose: () => void;
  onSaved: () => void;
  /** Optional Measure / Level switcher rendered in the top bar. */
  headerSlot?: React.ReactNode;
};

/** Live ARKit/ARCore tape-measure session (native builds only). */
export function ArMeasureSession({
  jobId,
  areaId,
  capabilities,
  onClose,
  onSaved,
  headerSlot,
}: ArMeasureSessionProps) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const viewRef = useRef<ArViewHandle | null>(null);

  const [tracking, setTracking] = useState<TrackingState>('initializing');
  const [unit, setUnit] = useState<MeasureUnit>('metric');
  const [label, setLabel] = useState('');
  const [projections, setProjections] = useState<Record<string, ProjectedPoint>>({});
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const session = useArMeasureSession();
  const canPlace = tracking === 'normal';
  const hasSegment = session.segments.length > 0;
  const canUndo = hasSegment || session.pending != null;

  useEffect(() => {
    getPreferences().then((prefs) => setUnit(prefs.measureUnit));
  }, []);

  useFocusEffect(
    useCallback(() => {
      const view = viewRef.current;
      void view?.resume();
      return () => {
        void view?.pause();
      };
    }, [])
  );

  const haptic = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
  };

  const setUnitAndPersist = async (next: MeasureUnit) => {
    setUnit(next);
    await savePreferences({ measureUnit: next });
  };

  const handleTap = async (x: number, y: number) => {
    if (!canPlace || saving) return;
    const view = viewRef.current;
    if (!view) return;
    setErrorMessage(null);
    try {
      const result = await session.placeAt(view, x, y);
      if (result === 'miss') {
        setErrorMessage(t('arMeasure.toastNoHit'));
        return;
      }
      haptic();
    } catch (error) {
      logger.error('AR place failed', error);
      setErrorMessage(t('arMeasure.toastNoHit'));
    }
  };

  const handleSave = async () => {
    if (!hasSegment || saving) return;
    const view = viewRef.current;
    if (!view) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const base64 = await view.snapshot();
      const lengthMeters = session.segments.reduce((sum, segment) => sum + segment.lengthMeters, 0);
      await saveMeasurementPhoto({
        jobId,
        areaId,
        base64Jpeg: base64,
        lengthMeters,
        unit,
        label,
      });
      haptic();
      onSaved();
    } catch (error) {
      logger.error('AR save failed', error);
      setErrorMessage(t('arMeasure.toastSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const hint =
    tracking === 'initializing'
      ? t('arMeasure.scanHint')
      : tracking === 'limited'
        ? t('arMeasure.trackingLimited')
        : session.pending
          ? t('arMeasure.placeEnd')
          : t('arMeasure.placeStart');

  const overlaySegments = session.segments.map((segment) => {
    const start = projections[segment.startId];
    const end = projections[segment.endId];
    return { segment, start, end };
  });
  const pendingProj = session.pending ? projections[session.pending.anchorId] : null;

  return (
    <View style={[styles.fill, { backgroundColor: '#000' }]}>
      <ExpoArView
        // Local ArViewHandle mirrors the native ref shape; cast keeps Expo Go free of type-only package imports.
        ref={viewRef as React.Ref<React.ElementRef<typeof ExpoArView>>}
        style={StyleSheet.absoluteFill}
        planeDetection="both"
        depthEnabled={capabilities.depthOrLidarAvailable}
        emitProjections
        onTrackingStateChange={(e) => setTracking(e.nativeEvent.state)}
        onTap={(e) => {
          void handleTap(e.nativeEvent.x, e.nativeEvent.y);
        }}
        onAnchorsChange={(e) => session.syncAnchors(e.nativeEvent.anchors)}
        onProjection={(e) => {
          const map: Record<string, ProjectedPoint> = {};
          for (const point of e.nativeEvent.points) {
            if (point.inFront) map[point.id] = point;
          }
          setProjections(map);
        }}
        onError={(e) => {
          logger.warn('AR error', e.nativeEvent);
          setErrorMessage(e.nativeEvent.message);
        }}
      />

      <Svg pointerEvents="none" width={winW} height={winH} style={StyleSheet.absoluteFill}>
        {overlaySegments.map(({ segment, start, end }) => {
          if (!start || !end) return null;
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          return (
            <React.Fragment key={segment.id}>
              <Line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#FF5A36" strokeWidth={3} />
              <Circle cx={start.x} cy={start.y} r={6} fill="#FFFFFF" stroke="#FF5A36" strokeWidth={2} />
              <Circle cx={end.x} cy={end.y} r={6} fill="#FFFFFF" stroke="#FF5A36" strokeWidth={2} />
              <SvgText
                x={midX}
                y={midY - 10}
                fill="#FFFFFF"
                stroke="#121412"
                strokeWidth={0.5}
                fontSize={14}
                fontWeight="700"
                textAnchor="middle"
              >
                {formatLength(segment.lengthMeters, unit)}
              </SvgText>
            </React.Fragment>
          );
        })}
        {pendingProj ? (
          <Circle
            cx={pendingProj.x}
            cy={pendingProj.y}
            r={7}
            fill="#FFB020"
            stroke="#FFFFFF"
            strokeWidth={2}
          />
        ) : null}
      </Svg>

      <View pointerEvents="none" style={styles.reticleWrap}>
        <View style={[styles.reticleRing, { borderColor: canPlace ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }]} />
        <View style={[styles.reticleDot, { backgroundColor: canPlace ? '#FF5A36' : 'rgba(255,255,255,0.5)' }]} />
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={styles.iconChip}
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </Pressable>
        {headerSlot ?? <View style={{ flex: 1 }} />}
        <View style={styles.unitRow}>
          <Pressable
            onPress={() => void setUnitAndPersist('metric')}
            style={[styles.unitChip, unit === 'metric' && styles.unitChipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: unit === 'metric' }}
            accessibilityLabel={t('arMeasure.unitMetric')}
          >
            <Text variant="caption" color="#FFFFFF">
              {headerSlot ? 'm' : t('arMeasure.unitMetric')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void setUnitAndPersist('imperial')}
            style={[styles.unitChip, unit === 'imperial' && styles.unitChipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: unit === 'imperial' }}
            accessibilityLabel={t('arMeasure.unitImperial')}
          >
            <Text variant="caption" color="#FFFFFF">
              {headerSlot ? 'ft' : t('arMeasure.unitImperial')}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.hintBanner, { top: insets.top + 56 }]}>
        <Text variant="bodySmall" color="#FFFFFF" style={{ textAlign: 'center' }}>
          {hint}
        </Text>
        {hasSegment ? (
          <Text variant="caption" color="rgba(255,255,255,0.8)" style={{ textAlign: 'center', marginTop: 4 }}>
            {t('arMeasure.segmentsCount', { count: session.segments.length })}
            {' · '}
            {formatLength(session.totalLengthMeters, unit)}
          </Text>
        ) : null}
        {errorMessage ? (
          <Text variant="caption" color="#FFB020" style={{ textAlign: 'center', marginTop: 4 }}>
            {errorMessage}
          </Text>
        ) : null}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder={t('arMeasure.labelPlaceholder')}
          placeholderTextColor="rgba(255,255,255,0.5)"
          style={styles.labelInput}
          editable={!saving}
        />
        <View style={styles.actions}>
          <Pressable
            onPress={() => void session.undo(viewRef.current)}
            disabled={!canUndo || saving}
            style={[styles.iconChip, (!canUndo || saving) && { opacity: 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel={t('arMeasure.undo')}
          >
            <Ionicons name="arrow-undo" size={20} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={() => void session.clear(viewRef.current)}
            disabled={(!canUndo && !hasSegment) || saving}
            style={[styles.iconChip, ((!canUndo && !hasSegment) || saving) && { opacity: 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel={t('arMeasure.clear')}
          >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Button
              label={saving ? t('arMeasure.saving') : t('arMeasure.save')}
              onPress={() => void handleSave()}
              disabled={!hasSegment || saving}
              loading={saving}
              icon={
                saving ? (
                  <ActivityIndicator color={colors.accentOnAccent} />
                ) : (
                  <Ionicons name="checkmark" size={18} color={colors.accentOnAccent} />
                )
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  unitRow: { flexDirection: 'row', gap: 8 },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  unitChipActive: {
    backgroundColor: 'rgba(255,90,54,0.9)',
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  hintBanner: {
    position: 'absolute',
    left: 24,
    right: 24,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  reticleWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  reticleDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingTop: 12,
  },
  labelInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

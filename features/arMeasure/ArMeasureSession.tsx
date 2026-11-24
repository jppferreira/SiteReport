import { Ionicons } from '@expo/vector-icons';
import { ExpoArView } from '@stewmore/expo-ar';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

import { Text } from '@/components';
import { ArTopBar, AR_COLORS, type ArToolMode } from '@/features/arTools';
import { useI18n } from '@/i18n/useI18n';
import { logger } from '@/utils/logger';

import type { ArViewHandle, Capabilities, ProjectedPoint, TrackingState } from './arTypes';
import { formatLength } from './formatLength';
import { centroid2 } from './measureMath';
import { buildMeasurementCaption, formatMeasurement, measurementName, measurementTable } from './measurementSummary';
import { EditMeasurementSheet, LowAccuracySheet, ManualEntrySheet, MeasureHelpSheet, SaveToReportSheet } from './MeasureSheets';
import { MeasurementsTray } from './MeasurementsTray';
import type { Measurement } from './measureSession';
import { saveMeasurementPhoto } from './saveMeasurementPhoto';
import { useArMeasureSession } from './useArMeasureSession';
import { useJobLabel } from './useJobLabel';
import { useMeasureUnit } from './useMeasureUnit';

export type ArMeasureSessionProps = {
  jobId: string;
  areaId: string | null;
  capabilities: Capabilities;
  /** False while the Level tab is showing: the AR session pauses but keeps its points. */
  active: boolean;
  onClose: () => void;
  onChangeMode: (mode: ArToolMode) => void;
  onSaved: () => void;
  /** Lets the screen ask "save first?" when closing from either tab. */
  onUnsavedChange?: (hasUnsaved: boolean) => void;
  /** Bumped by the screen to open the save sheet (from the close prompt). */
  saveRequest?: number;
  /** The sensors can't do AR here: send the user to typing sizes in. */
  onTypeInstead: () => void;
};

/** Live ARKit/ARCore tape measure: scan, place, measured tray, save to report. */
export function ArMeasureSession({ jobId, areaId, capabilities, active, onClose, onChangeMode, onSaved, onUnsavedChange, saveRequest = 0, onTypeInstead }: ArMeasureSessionProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const viewRef = useRef<ArViewHandle | null>(null);
  const [tracking, setTracking] = useState<TrackingState>('initializing');
  const [caps, setCaps] = useState(capabilities);
  const [projections, setProjections] = useState<Record<string, ProjectedPoint>>({});
  const [unit, setUnit] = useMeasureUnit();
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [trayOpen, setTrayOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Measurement | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [lowAccuracyOpen, setLowAccuracyOpen] = useState(false);
  const lowAccuracyShownRef = useRef(false);
  const [save, setSave] = useState<{ base64: string | null; loading: boolean } | null>(null);
  const [includeTable, setIncludeTable] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const jobLabel = useJobLabel(jobId);

  const center = useMemo(() => ({ x: winW / 2, y: winH * 0.45 }), [winW, winH]);
  const session = useArMeasureSession({ viewRef, active, tracking, center, projections, snapEnabled });
  const { state, aim, dispatch } = session;
  const hasMeasurements = state.measurements.length > 0;
  const placing = state.chain.length > 0;
  const surfaceFound = tracking === 'normal' && aim.hit;
  const lidar = caps.depthOrLidarAvailable;

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    void (active ? view.resume() : view.pause()).catch(() => undefined);
  }, [active]);

  useEffect(() => {
    onUnsavedChange?.(hasMeasurements);
  }, [hasMeasurements, onUnsavedChange]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const haptic = (kind: 'tick' | 'success' = 'tick') => {
    if (Platform.OS === 'web') return;
    void (kind === 'success' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.selectionAsync()).catch(() => undefined);
  };

  const openSave = useCallback(async () => {
    setTrayOpen(false);
    setSave({ base64: null, loading: true });
    try {
      const base64 = (await viewRef.current?.snapshot()) ?? null;
      setSave({ base64, loading: false });
    } catch (error) {
      logger.warn('AR snapshot failed', { error: String(error) });
      setSave({ base64: null, loading: false });
      setToast(t('arTools.measure.snapshotError'));
    }
  }, [t]);

  const lastSaveRequest = useRef(saveRequest);
  useEffect(() => {
    if (saveRequest !== lastSaveRequest.current) {
      lastSaveRequest.current = saveRequest;
      // The parent asks for the save sheet imperatively (close → "Save to report"); opening it is the point.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (hasMeasurements) void openSave();
    }
  }, [saveRequest, hasMeasurements, openSave]);

  const handleAdd = async () => {
    if (!surfaceFound) return;
    try {
      const result = await session.addPoint();
      if (result === 'miss') {
        setToast(t('arTools.measure.noSurface'));
        return;
      }
      haptic(result === 'closed' ? 'success' : 'tick');
      if (result === 'closed') setTrayOpen(true);
    } catch (error) {
      logger.error('AR place failed', error);
      setToast(t('arTools.measure.noSurface'));
    }
  };

  const handleFinish = () => {
    dispatch({ type: 'finish' });
    haptic('success');
    setTrayOpen(true);
  };

  const handleClear = () => {
    const doClear = () => {
      void session.clear();
      setSelectedId(null);
      setTrayOpen(false);
    };
    if (Object.keys(state.points).length >= 3 || state.measurements.length >= 2) {
      Alert.alert(t('arTools.measure.clearTitle'), t('arTools.measure.clearBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('arTools.measure.clear'), style: 'destructive', onPress: doClear },
      ]);
    } else doClear();
  };

  const submitSave = async (caption: string) => {
    if (!save?.base64) return;
    try {
      await saveMeasurementPhoto({ jobId, areaId, base64Jpeg: save.base64, caption });
      haptic('success');
      setSave(null);
      setSavedCount((n) => n + 1);
      onUnsavedChange?.(false);
      onSaved();
    } catch (error) {
      logger.error('AR save failed', error);
      setToast(t('arTools.measure.saveError'));
    }
  };

  // ---------- overlay geometry ----------
  const screenOf = (id: string | undefined) => {
    if (!id) return null;
    const p = projections[id];
    return p?.inFront ? p : null;
  };
  const lines = state.measurements.filter((m) => m.kind === 'line' && m.pointIds.length === 2);
  const areas = state.measurements.filter((m) => m.kind === 'area');
  const lastId = state.chain[state.chain.length - 1];
  const lastScreen = lastId ? screenOf(lastId) : null;
  const pointIds = Object.keys(state.points);

  const coach = active && (!surfaceFound && !hasMeasurements && !placing);
  const hint = !surfaceFound
    ? tracking === 'limited' ? t('arTools.measure.trackingLimited') : t('arTools.measure.keepGoing')
    : aim.snap === 'close'
      ? t('arTools.measure.tapToClose')
      : placing ? t('arTools.measure.aimNext') : t('arTools.measure.aimStart');

  const accuracyChip = (
    <Pressable onPress={() => (!lidar ? setLowAccuracyOpen(true) : undefined)} style={[styles.chip, lidar ? styles.chipOk : styles.chipWarn]} accessibilityRole={lidar ? 'text' : 'button'}>
      <Ionicons name={lidar ? 'scan-outline' : 'warning-outline'} size={13} color={lidar ? AR_COLORS.brand : '#9A5B00'} />
      <Text variant="caption" color={lidar ? AR_COLORS.ink : '#7A4700'}>{lidar ? t('arTools.measure.lidarChip') : t('arTools.measure.cameraChip')}</Text>
    </Pressable>
  );

  return (
    <View style={styles.fill}>
      <ExpoArView
        // Local ArViewHandle mirrors the native ref shape; cast keeps Expo Go free of type-only package imports.
        ref={viewRef as React.Ref<React.ElementRef<typeof ExpoArView>>}
        style={StyleSheet.absoluteFill}
        planeDetection="both"
        depthEnabled={caps.depthOrLidarAvailable}
        emitProjections
        onReady={(e) => {
          setCaps(e.nativeEvent.capabilities);
          if (!e.nativeEvent.capabilities.depthOrLidarAvailable && !lowAccuracyShownRef.current) {
            lowAccuracyShownRef.current = true;
            setLowAccuracyOpen(true);
          }
        }}
        onTrackingStateChange={(e) => setTracking(e.nativeEvent.state)}
        onTap={(e) => {
          if (!surfaceFound || trayOpen) return;
          void session.addPointAt(e.nativeEvent.x, e.nativeEvent.y).then((r) => r === 'placed' && haptic());
        }}
        onAnchorsChange={(e) => session.syncAnchors(e.nativeEvent.anchors)}
        onProjection={(e) => {
          const map: Record<string, ProjectedPoint> = {};
          for (const point of e.nativeEvent.points) map[point.id] = point;
          setProjections(map);
        }}
        onError={(e) => {
          logger.warn('AR error', e.nativeEvent);
          setToast(e.nativeEvent.message);
        }}
      />

      <Svg pointerEvents="none" width={winW} height={winH} style={StyleSheet.absoluteFill}>
        {areas.map((m) => {
          const pts = m.pointIds.map(screenOf);
          if (pts.some((p) => !p)) return null;
          return <Polygon key={m.id} points={pts.map((p) => `${p!.x},${p!.y}`).join(' ')} fill="rgba(31,168,74,0.28)" stroke={AR_COLORS.brand} strokeWidth={m.id === selectedId ? 3 : 2} strokeDasharray="6 5" />;
        })}
        {lines.map((m) => {
          const a = screenOf(m.pointIds[0]);
          const b = screenOf(m.pointIds[1]);
          if (!a || !b) return null;
          return <Line key={m.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={AR_COLORS.brand} strokeWidth={m.id === selectedId ? 5 : 3} strokeLinecap="round" />;
        })}
        {active && lastScreen && surfaceFound ? (
          <Line x1={lastScreen.x} y1={lastScreen.y} x2={aim.screen.x} y2={aim.screen.y} stroke="#FFFFFF" strokeWidth={2.5} strokeDasharray="8 6" strokeLinecap="round" />
        ) : null}
        {pointIds.map((id) => {
          const p = screenOf(id);
          if (!p) return null;
          const first = state.chain[0] === id && state.chain.length >= 3;
          return <Circle key={id} cx={p.x} cy={p.y} r={first ? 9 : 7} fill={AR_COLORS.brand} stroke="#FFFFFF" strokeWidth={2.5} />;
        })}
      </Svg>

      {/* Pill labels (RN views so they use Lexend and stay crisp) */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {lines.map((m) => {
          const a = screenOf(m.pointIds[0]);
          const b = screenOf(m.pointIds[1]);
          if (!a || !b) return null;
          return <LabelPill key={m.id} x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} text={formatMeasurement(m, unit)} />;
        })}
        {areas.map((m) => {
          const c = centroid2(m.pointIds.map(screenOf).filter((p): p is ProjectedPoint => !!p));
          return c ? <LabelPill key={m.id} x={c.x} y={c.y} text={formatMeasurement(m, unit)} light icon="scan-outline" /> : null;
        })}
        {active && lastScreen && surfaceFound && aim.liveLengthMeters != null ? (
          <LabelPill x={(lastScreen.x + aim.screen.x) / 2} y={(lastScreen.y + aim.screen.y) / 2} text={formatLength(aim.liveLengthMeters, unit)} live />
        ) : null}
      </View>

      {/* Reticle */}
      {active && !trayOpen ? (
        <View pointerEvents="none" style={[styles.reticle, { left: aim.screen.x - 30, top: aim.screen.y - 30 }]}>
          <View style={[styles.reticleRing, { borderColor: surfaceFound ? '#FFFFFF' : 'rgba(255,255,255,0.45)' }, aim.snap === 'close' && { borderColor: AR_COLORS.brand }]} />
          <View style={[styles.reticleDot, { backgroundColor: surfaceFound ? AR_COLORS.brand : 'rgba(255,255,255,0.6)' }]} />
          {aim.snap && surfaceFound ? (
            <View style={styles.snapBadge}>
              <Ionicons name="checkmark" size={12} color={AR_COLORS.brand} />
              <Text variant="caption" color={AR_COLORS.ink}>{t(`arTools.measure.snap.${aim.snap}`)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Top chrome */}
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <ArTopBar tone="light" mode="measure" onChangeMode={onChangeMode} onClose={onClose} right={{ icon: 'help', label: t('arTools.measure.help'), onPress: () => setHelpOpen(true) }} />
        <View style={styles.secondRow}>
          {accuracyChip}
          <View style={styles.secondRowRight}>
            <GlassPill icon="arrow-undo" label={t('arTools.measure.undo')} disabled={state.history.length === 0} onPress={() => { dispatch({ type: 'undo' }); haptic(); }} />
            <GlassPill icon="trash-outline" label={t('arTools.measure.clear')} disabled={!hasMeasurements && !placing} onPress={handleClear} />
          </View>
        </View>
        {coach ? (
          <View style={styles.coach} accessibilityLiveRegion="polite">
            <Ionicons name="phone-portrait-outline" size={30} color={AR_COLORS.brand} />
            <Text variant="h3" color={AR_COLORS.ink} style={styles.center}>{t('arTools.measure.coachTitle')}</Text>
            <Text variant="bodySmall" color={AR_COLORS.muted} style={styles.center}>{t('arTools.measure.coachBody')}</Text>
            <View style={styles.coachStatus}>
              <Text variant="caption" color={AR_COLORS.muted}>{t('arTools.measure.findingSurfaces')}</Text>
              <Text variant="caption" color={tracking === 'normal' ? AR_COLORS.brand : AR_COLORS.muted}>{tracking === 'normal' ? t('arTools.measure.trackingReady') : t('arTools.measure.trackingStarting')}</Text>
            </View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: tracking === 'normal' ? '75%' : tracking === 'limited' ? '45%' : '18%' }]} /></View>
          </View>
        ) : null}
      </View>

      {toast ? <View style={[styles.toast, { top: insets.top + 110 }]}><Text variant="caption" color="#FFFFFF" style={styles.center}>{toast}</Text></View> : null}

      {/* Bottom: capture controls, or the measured tray */}
      {trayOpen && hasMeasurements ? (
        <View style={styles.trayWrap}>
          <MeasurementsTray
            measurements={state.measurements}
            unit={unit}
            onChangeUnit={setUnit}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={setEditing}
            dispatch={dispatch}
            onCollapse={() => setTrayOpen(false)}
            bottomInset={insets.bottom}
            maxListHeight={winH * 0.3}
            secondary={{ label: t('arTools.measure.newLine'), icon: 'add', onPress: () => { setTrayOpen(false); setSelectedId(null); } }}
            primary={{ label: t('arTools.measure.saveToReport'), onPress: () => void openSave() }}
          />
        </View>
      ) : (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.hintPill}><Text variant="caption" color="#FFFFFF">{hint}</Text></View>
          <View style={styles.controls}>
            {placing ? (
              <RoundAction icon="magnet-outline" label={t(snapEnabled ? 'arTools.measure.snapOn' : 'arTools.measure.snapOff')} active={snapEnabled} onPress={() => setSnapEnabled((v) => !v)} />
            ) : (
              <RoundAction icon="albums-outline" label={t('arTools.measure.saved', { count: state.measurements.length + savedCount })} disabled={!hasMeasurements} onPress={() => setTrayOpen(true)} />
            )}
            <View style={styles.addWrap}>
              <Pressable
                onPress={() => void handleAdd()}
                disabled={!surfaceFound}
                style={({ pressed }) => [styles.addButton, !surfaceFound && styles.addDisabled, pressed && { transform: [{ scale: 0.95 }] }]}
                accessibilityRole="button"
                accessibilityLabel={aim.snap === 'close' ? t('arTools.measure.tapToClose') : t('arTools.measure.addPoint')}
                accessibilityState={{ disabled: !surfaceFound }}
              >
                <Ionicons name="add" size={38} color="#FFFFFF" />
              </Pressable>
              <Text variant="caption" color="#FFFFFF" style={styles.shadowText}>{t('arTools.measure.addPoint')}</Text>
            </View>
            {placing ? (
              <RoundAction icon="checkmark" label={t('arTools.measure.finish')} onPress={handleFinish} />
            ) : (
              <RoundAction icon="keypad-outline" label={t('arTools.measure.typeIt')} onPress={() => setManualOpen(true)} />
            )}
          </View>
        </View>
      )}

      <EditMeasurementSheet
        measurement={editing}
        unit={unit}
        onClose={() => setEditing(null)}
        onSave={(name, value) => {
          if (!editing) return;
          dispatch({ type: 'rename', id: editing.id, name });
          if (Math.abs(value - editing.value) > 1e-6) dispatch({ type: 'setValue', id: editing.id, value });
          setEditing(null);
        }}
        onDelete={() => {
          if (editing) dispatch({ type: 'remove', id: editing.id });
          setEditing(null);
        }}
      />
      <ManualEntrySheet visible={manualOpen} unit={unit} onClose={() => setManualOpen(false)} onAdd={(kind, name, value) => { dispatch({ type: 'addManual', kind, name, value }); setManualOpen(false); setTrayOpen(true); }} />
      <MeasureHelpSheet visible={helpOpen} onClose={() => setHelpOpen(false)} />
      <LowAccuracySheet visible={lowAccuracyOpen} onClose={() => setLowAccuracyOpen(false)} onMeasureAnyway={() => setLowAccuracyOpen(false)} onTypeInstead={() => { setLowAccuracyOpen(false); onTypeInstead(); }} />
      <SaveToReportSheet
        visible={!!save}
        previewUri={save?.base64 ? `data:image/jpeg;base64,${save.base64}` : null}
        loadingPreview={!!save?.loading}
        jobLabel={jobLabel}
        defaultCaption={buildMeasurementCaption(state.measurements, unit, t, { title: state.measurements[0] ? measurementName(state.measurements[0], t) : '', includeTable: false })}
        includeTable={includeTable}
        onToggleTable={setIncludeTable}
        onClose={() => setSave(null)}
        onSubmit={(caption) => submitSave(includeTable ? `${caption.trim()}\n${measurementTable(state.measurements, unit, t)}` : caption)}
      />
    </View>
  );
}

function LabelPill({ x, y, text, light, live, icon }: { x: number; y: number; text: string; light?: boolean; live?: boolean; icon?: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={[styles.labelPill, { left: x - 60, top: y - 16 }]}>
      {icon ? <Ionicons name={icon} size={13} color={light ? AR_COLORS.ink : '#FFFFFF'} style={styles.labelIcon} /> : null}
      <Text variant="label" color={light ? AR_COLORS.ink : '#FFFFFF'} style={[styles.labelText, light && styles.labelTextLight, live && styles.labelTextLive]}>{text}</Text>
    </View>
  );
}

function GlassPill({ icon, label, onPress, disabled }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.glassPill, disabled && { opacity: 0.5 }]} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }}>
      <Ionicons name={icon} size={15} color={AR_COLORS.ink} />
      <Text variant="label" color={AR_COLORS.ink}>{label}</Text>
    </Pressable>
  );
}

function RoundAction({ icon, label, onPress, active, disabled }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.roundWrap, disabled && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active, disabled: !!disabled }}>
      <View style={[styles.round, active && { borderColor: AR_COLORS.brand, borderWidth: 2 }]}>
        <Ionicons name={icon} size={20} color={AR_COLORS.ink} />
      </View>
      <Text variant="caption" color="#FFFFFF" style={styles.shadowText} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { textAlign: 'center' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, gap: 10 },
  secondRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  secondRowRight: { flexDirection: 'row', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chipOk: { backgroundColor: AR_COLORS.lightGlass },
  chipWarn: { backgroundColor: '#FFF1D6', borderWidth: 1, borderColor: AR_COLORS.warning },
  glassPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 999, backgroundColor: AR_COLORS.lightGlass, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 7, shadowOffset: { width: 0, height: 4 } },
  coach: { marginHorizontal: 28, marginTop: 14, padding: 18, gap: 6, borderRadius: 18, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  coachStatus: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 8 },
  progressTrack: { alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: '#E3E6E3', overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: AR_COLORS.brand },
  reticle: { position: 'absolute', width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  reticleRing: { position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 2.5 },
  reticleDot: { width: 8, height: 8, borderRadius: 4 },
  snapBadge: { position: 'absolute', left: 58, top: 16, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: AR_COLORS.lightGlass, width: 150 },
  labelPill: { position: 'absolute', width: 120, height: 32, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' },
  labelText: { backgroundColor: AR_COLORS.brand, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, overflow: 'hidden', borderWidth: 1.5, borderColor: '#FFFFFF', fontVariant: ['tabular-nums'] },
  labelTextLight: { backgroundColor: AR_COLORS.iconTile, borderColor: AR_COLORS.brand, paddingLeft: 26 },
  labelTextLive: { backgroundColor: 'rgba(18,20,18,0.78)' },
  labelIcon: { position: 'absolute', left: 18, zIndex: 1 },
  toast: { position: 'absolute', alignSelf: 'center', left: 40, right: 40, padding: 10, borderRadius: 12, backgroundColor: 'rgba(18,20,18,0.8)' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 16 },
  hintPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: AR_COLORS.glassStrong },
  controls: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 32 },
  roundWrap: { alignItems: 'center', gap: 6, width: 76 },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: AR_COLORS.lightGlass },
  addWrap: { alignItems: 'center', gap: 6 },
  addButton: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: AR_COLORS.brand, borderWidth: 4, borderColor: 'rgba(255,255,255,0.85)' },
  addDisabled: { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.5)' },
  shadowText: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  trayWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});

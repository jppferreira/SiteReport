import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AR_COLORS, ArTopBar, type ArToolMode } from '@/features/arTools';
import { LevelToolView } from '@/features/levelTool';
import { useI18n } from '@/i18n/useI18n';

import { getArCapabilities } from './arCapabilities';
import type { ArMeasureSessionProps } from './ArMeasureSession';
import { ManualMeasureView } from './ManualMeasureView';

type ArMeasureScreenProps = {
  jobId: string;
  areaId: string | null;
  onClose: () => void;
  onSaved: () => void;
  initialMode?: ArToolMode;
};

type SessionComponent = React.ComponentType<ArMeasureSessionProps>;

/**
 * Job measure tools — AR tape measure and spirit level behind one Measure | Level
 * switcher. The AR session stays mounted (paused) while Level shows, so points
 * survive a quick level check.
 */
export function ArMeasureScreen({ jobId, areaId, onClose, onSaved, initialMode = 'measure' }: ArMeasureScreenProps) {
  const { t } = useI18n();
  const caps = useMemo(() => getArCapabilities(), []);
  const [mode, setMode] = useState<ArToolMode>(initialMode);
  const [manual, setManual] = useState(!caps.arSupported);
  const [Session, setSession] = useState<SessionComponent | null>(null);
  const [loadError, setLoadError] = useState(false);
  const unsavedRef = useRef(false);
  const [saveRequest, setSaveRequest] = useState(0);

  useEffect(() => {
    if (!caps.arSupported) return;
    let cancelled = false;
    // Lazy-load so Expo Go / unlinked builds never evaluate @stewmore/expo-ar.
    import('./ArMeasureSession')
      .then((mod) => {
        if (!cancelled) setSession(() => mod.ArMeasureSession);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          setManual(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [caps.arSupported]);

  const handleUnsaved = useCallback((value: boolean) => {
    unsavedRef.current = value;
  }, []);

  const handleClose = useCallback(() => {
    if (!unsavedRef.current) {
      onClose();
      return;
    }
    Alert.alert(t('arTools.measure.unsavedTitle'), t('arTools.measure.unsavedBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('arTools.measure.discard'), style: 'destructive', onPress: onClose },
      { text: t('arTools.measure.saveToReport'), onPress: () => { setMode('measure'); setManual(false); setSaveRequest((n) => n + 1); } },
    ]);
  }, [onClose, t]);

  const handleSaved = useCallback(() => {
    unsavedRef.current = false;
    onSaved();
  }, [onSaved]);

  const arAvailable = caps.arSupported && !loadError;

  return (
    <View style={styles.fill}>
      {arAvailable && Session ? (
        <View style={[StyleSheet.absoluteFill, (mode !== 'measure' || manual) && styles.hidden]} pointerEvents={mode === 'measure' && !manual ? 'auto' : 'none'}>
          <Session
            jobId={jobId}
            areaId={areaId}
            capabilities={caps}
            active={mode === 'measure' && !manual}
            onClose={handleClose}
            onChangeMode={setMode}
            onSaved={handleSaved}
            onUnsavedChange={handleUnsaved}
            saveRequest={saveRequest}
            onTypeInstead={() => setManual(true)}
          />
        </View>
      ) : null}

      {mode === 'measure' && manual ? (
        <View style={StyleSheet.absoluteFill}>
          <ManualMeasureView
            jobId={jobId}
            areaId={areaId}
            reason={arAvailable ? 'chosen' : 'unsupported'}
            onClose={handleClose}
            onChangeMode={setMode}
            onSaved={handleSaved}
            onBackToCamera={arAvailable ? () => setManual(false) : undefined}
          />
        </View>
      ) : null}

      {mode === 'measure' && !manual && !Session ? (
        <View style={[StyleSheet.absoluteFill, styles.loading]}>
          <ArTopBar mode="measure" onChangeMode={setMode} onClose={handleClose} style={styles.loadingBar} />
        </View>
      ) : null}

      {mode === 'level' ? (
        <View style={StyleSheet.absoluteFill}>
          <LevelToolView active onClose={handleClose} onChangeMode={setMode} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  // Keep the native AR view mounted but out of sight while another tab shows.
  hidden: { opacity: 0 },
  loading: { backgroundColor: AR_COLORS.bg, paddingTop: 60 },
  loadingBar: {},
});

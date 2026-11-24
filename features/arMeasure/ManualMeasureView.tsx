import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useReducer, useState } from 'react';
import { Alert, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components';
import { ArTopBar, AR_COLORS, type ArToolMode } from '@/features/arTools';
import { useI18n } from '@/i18n/useI18n';
import { requestPhotoLibraryAccess } from '@/services/photoLibraryAccess';
import { logger } from '@/utils/logger';

import { buildMeasurementCaption, measurementName, measurementTable } from './measurementSummary';
import { EditMeasurementSheet, ManualEntrySheet, SaveToReportSheet } from './MeasureSheets';
import { MeasurementsTray } from './MeasurementsTray';
import { initialMeasureSession, measureSessionReducer, type Measurement } from './measureSession';
import { saveMeasurementPhoto } from './saveMeasurementPhoto';
import { useJobLabel } from './useJobLabel';
import { useMeasureUnit } from './useMeasureUnit';

type ManualMeasureViewProps = {
  jobId: string;
  areaId: string | null;
  /** Why we are here: no AR on this phone, or the user chose to type sizes. */
  reason: 'unsupported' | 'chosen';
  onClose: () => void;
  onChangeMode: (mode: ArToolMode) => void;
  onSaved: () => void;
  onBackToCamera?: () => void;
};

/** Type dimensions in by hand, then attach them to a photo in the report. */
export function ManualMeasureView({ jobId, areaId, reason, onClose, onChangeMode, onSaved, onBackToCamera }: ManualMeasureViewProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [state, dispatch] = useReducer(measureSessionReducer, initialMeasureSession);
  const [unit, setUnit] = useMeasureUnit();
  const [entryOpen, setEntryOpen] = useState(reason === 'chosen');
  const [editing, setEditing] = useState<Measurement | null>(null);
  const [photo, setPhoto] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [includeTable, setIncludeTable] = useState(true);
  const jobLabel = useJobLabel(jobId);

  const pickPhoto = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(t('arTools.measure.photoPermissionTitle'), t('arTools.measure.photoPermissionBody'));
          return;
        }
      } else {
        // Android uses the system photo picker (no broad media permission).
        const allowed = await requestPhotoLibraryAccess();
        if (!allowed) {
          Alert.alert(t('arTools.measure.photoPermissionTitle'), t('arTools.measure.photoPermissionBody'));
          return;
        }
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      const asset = result.canceled ? null : result.assets[0];
      if (asset) setPhoto({ uri: asset.uri, width: asset.width, height: asset.height });
    } catch (error) {
      logger.warn('Manual measure photo failed', { error: String(error) });
    }
  };

  const choosePhoto = () => {
    Alert.alert(t('arTools.measure.photoTitle'), t('arTools.measure.photoBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('arTools.measure.takePhoto'), onPress: () => void pickPhoto('camera') },
      { text: t('arTools.measure.choosePhoto'), onPress: () => void pickPhoto('library') },
    ]);
  };

  return (
    <View style={[styles.fill, { paddingTop: insets.top + 6 }]}>
      <ArTopBar mode="measure" onChangeMode={onChangeMode} onClose={onClose} right={onBackToCamera ? { icon: 'camera-outline', label: t('arTools.measure.backToCamera'), onPress: onBackToCamera } : undefined} />
      <View style={styles.intro}>
        <View style={styles.introIcon}><Ionicons name="keypad-outline" size={26} color={AR_COLORS.brandText} /></View>
        <Text variant="h2" color="#FFFFFF" style={styles.center}>{t(reason === 'unsupported' ? 'arTools.measure.unsupportedTitle' : 'arTools.measure.manualTitle')}</Text>
        <Text variant="bodySmall" color={AR_COLORS.textSoft} style={styles.center}>{t(reason === 'unsupported' ? 'arTools.measure.unsupportedBody' : 'arTools.measure.manualIntro')}</Text>
      </View>
      <View style={styles.trayWrap}>
        <MeasurementsTray
          measurements={state.measurements}
          unit={unit}
          onChangeUnit={setUnit}
          selectedId={null}
          onSelect={() => undefined}
          onEdit={setEditing}
          dispatch={dispatch}
          bottomInset={insets.bottom}
          maxListHeight={height * 0.38}
          secondary={{ label: t('arTools.measure.addShort'), icon: 'add', onPress: () => setEntryOpen(true) }}
          primary={{ label: t('arTools.measure.saveToReport'), onPress: choosePhoto, disabled: state.measurements.length === 0 }}
        />
      </View>
      <ManualEntrySheet visible={entryOpen} unit={unit} onClose={() => setEntryOpen(false)} onAdd={(kind, name, value) => { dispatch({ type: 'addManual', kind, name, value }); setEntryOpen(false); }} />
      <EditMeasurementSheet
        measurement={editing}
        unit={unit}
        onClose={() => setEditing(null)}
        onSave={(name, value) => {
          if (!editing) return;
          dispatch({ type: 'rename', id: editing.id, name });
          dispatch({ type: 'setValue', id: editing.id, value });
          setEditing(null);
        }}
        onDelete={() => {
          if (editing) dispatch({ type: 'remove', id: editing.id });
          setEditing(null);
        }}
      />
      <SaveToReportSheet
        visible={!!photo}
        previewUri={photo?.uri ?? null}
        loadingPreview={false}
        jobLabel={jobLabel}
        defaultCaption={buildMeasurementCaption(state.measurements, unit, t, { title: state.measurements[0] ? measurementName(state.measurements[0], t) : '', includeTable: false })}
        includeTable={includeTable}
        onToggleTable={setIncludeTable}
        onClose={() => setPhoto(null)}
        onSubmit={async (caption) => {
          if (!photo) return;
          try {
            await saveMeasurementPhoto({
              jobId,
              areaId,
              sourceUri: photo.uri,
              width: photo.width,
              height: photo.height,
              caption: includeTable ? `${caption.trim()}\n${measurementTable(state.measurements, unit, t)}` : caption,
            });
            setPhoto(null);
            onSaved();
          } catch (error) {
            logger.error('Manual measure save failed', error);
            Alert.alert(t('arTools.measure.saveError'));
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: AR_COLORS.bg },
  center: { textAlign: 'center' },
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  introIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: AR_COLORS.brandSoft, marginBottom: 6 },
  trayWrap: {},
});

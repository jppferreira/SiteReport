import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components';
import { AR_COLORS } from '@/features/arTools';
import { useI18n } from '@/i18n/useI18n';

import { MEASURE_UNITS, type MeasureUnit } from './formatLength';
import { formatMeasurement, measurementName } from './measurementSummary';
import type { Measurement, MeasureSessionAction } from './measureSession';

type MeasurementsTrayProps = {
  measurements: Measurement[];
  unit: MeasureUnit;
  onChangeUnit: (unit: MeasureUnit) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (m: Measurement) => void;
  dispatch: (action: MeasureSessionAction) => void;
  primary: { label: string; onPress: () => void; disabled?: boolean };
  secondary: { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void };
  onCollapse?: () => void;
  bottomInset: number;
  maxListHeight: number;
};

/** White tray: measurements list with inline rename, units, New line / Save to report. */
export function MeasurementsTray({
  measurements,
  unit,
  onChangeUnit,
  selectedId,
  onSelect,
  onEdit,
  dispatch,
  primary,
  secondary,
  onCollapse,
  bottomInset,
  maxListHeight,
}: MeasurementsTrayProps) {
  const { t } = useI18n();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const subtitle = (m: Measurement) => {
    if (m.source === 'manual') return t('arTools.measure.rowTyped');
    if (m.source === 'edited') return t('arTools.measure.rowEdited');
    if (m.kind === 'area') return t('arTools.measure.rowArea');
    return t('arTools.measure.rowLine', { count: m.pointIds.length });
  };

  return (
    <View style={[styles.tray, { paddingBottom: bottomInset + 12 }]}>
      <Pressable onPress={onCollapse} accessibilityRole="button" accessibilityLabel={t('arTools.measure.collapseTray')} style={styles.handleHit} disabled={!onCollapse}>
        <View style={styles.handle} />
      </Pressable>
      <View style={styles.header}>
        <View style={{ flexShrink: 1 }}>
          <Text variant="h3" color={AR_COLORS.ink}>{t('arTools.measure.trayTitle')}</Text>
          <Text variant="caption" color={AR_COLORS.muted}>
            {measurements.length === 0 ? t('arTools.measure.trayEmpty') : t('arTools.measure.traySubtitle', { count: measurements.length })}
          </Text>
        </View>
        <View style={styles.units} accessibilityRole="radiogroup">
          {MEASURE_UNITS.map((u) => (
            <Pressable key={u} onPress={() => onChangeUnit(u)} style={[styles.unit, unit === u && styles.unitActive]} accessibilityRole="radio" accessibilityState={{ checked: unit === u }} accessibilityLabel={t(`arTools.measure.units.${u}`)}>
              <Text variant="caption" color={unit === u ? '#FFFFFF' : AR_COLORS.ink}>{t(`arTools.measure.unitShort.${u}`)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView style={{ maxHeight: maxListHeight }} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {measurements.map((m) => {
          const selected = m.id === selectedId;
          return (
            <Pressable key={m.id} onPress={() => onSelect(selected ? null : m.id)} style={[styles.row, selected && styles.rowSelected]} accessibilityRole="button" accessibilityState={{ selected }}>
              <View style={styles.iconTile}>
                <Ionicons name={m.kind === 'area' ? 'scan-outline' : 'resize-outline'} size={18} color={AR_COLORS.brand} />
              </View>
              <View style={styles.rowText}>
                {renamingId === m.id ? (
                  <TextInput
                    autoFocus
                    value={draft}
                    onChangeText={setDraft}
                    onBlur={() => {
                      dispatch({ type: 'rename', id: m.id, name: draft });
                      setRenamingId(null);
                    }}
                    onSubmitEditing={() => {
                      dispatch({ type: 'rename', id: m.id, name: draft });
                      setRenamingId(null);
                    }}
                    placeholder={measurementName({ ...m, name: '' }, t)}
                    returnKeyType="done"
                    maxLength={60}
                    style={styles.renameInput}
                    accessibilityLabel={t('arTools.measure.renameA11y')}
                  />
                ) : (
                  <Pressable onPress={() => { setDraft(m.name); setRenamingId(m.id); }} accessibilityRole="button" accessibilityLabel={t('arTools.measure.renameNamed', { name: measurementName(m, t) })}>
                    <Text variant="bodyMedium" color={AR_COLORS.ink} numberOfLines={1}>{measurementName(m, t)}</Text>
                  </Pressable>
                )}
                <Text variant="caption" color={AR_COLORS.muted}>{subtitle(m)}{selected ? ` · ${t('arTools.measure.selected')}` : ''}</Text>
              </View>
              <Text variant="h3" color={AR_COLORS.ink} style={styles.value}>{formatMeasurement(m, unit)}</Text>
              <Pressable onPress={() => onEdit(m)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('arTools.measure.editNamed', { name: measurementName(m, t) })}>
                <Ionicons name="pencil-outline" size={18} color={AR_COLORS.muted} />
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable onPress={secondary.onPress} style={[styles.button, styles.buttonOutline]} accessibilityRole="button">
          <Ionicons name={secondary.icon} size={18} color={AR_COLORS.ink} />
          <Text variant="button" color={AR_COLORS.ink}>{secondary.label}</Text>
        </Pressable>
        <Pressable onPress={primary.onPress} disabled={primary.disabled} style={[styles.button, styles.buttonPrimary, primary.disabled && { opacity: 0.4 }]} accessibilityRole="button" accessibilityState={{ disabled: !!primary.disabled }}>
          <Ionicons name="document-attach-outline" size={18} color="#FFFFFF" />
          <Text variant="button" color="#FFFFFF">{primary.label}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tray: { backgroundColor: AR_COLORS.sheet, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, gap: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 12 },
  handleHit: { alignItems: 'center', paddingTop: 8, paddingBottom: 2 },
  handle: { width: 36, height: 5, borderRadius: 3, backgroundColor: '#D5D8D5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  units: { flexDirection: 'row', padding: 3, borderRadius: 999, backgroundColor: '#EEF0EE' },
  unit: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  unitActive: { backgroundColor: AR_COLORS.ink },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: AR_COLORS.row, borderWidth: 1.5, borderColor: 'transparent' },
  rowSelected: { backgroundColor: AR_COLORS.rowSelected, borderColor: AR_COLORS.brand },
  iconTile: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: AR_COLORS.iconTile },
  rowText: { flex: 1, gap: 1 },
  renameInput: { fontFamily: 'Lexend_500Medium', fontSize: 16, color: AR_COLORS.ink, paddingVertical: 0, borderBottomWidth: 1, borderColor: AR_COLORS.brand },
  value: { fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  button: { flex: 1, height: 52, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonOutline: { borderWidth: 1.5, borderColor: '#D9DCD9', backgroundColor: '#FFFFFF' },
  buttonPrimary: { backgroundColor: AR_COLORS.ink, flex: 1.4 },
});

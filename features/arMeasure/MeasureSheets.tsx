import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { BottomSheet, Text } from '@/components';
import { AR_COLORS } from '@/features/arTools';
import { useI18n } from '@/i18n/useI18n';

import { areaToInput, lengthToInput, parseArea, parseLength, type MeasureUnit } from './formatLength';
import { measurementName } from './measurementSummary';
import type { Measurement } from './measureSession';

function SheetHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text variant="h3" color={AR_COLORS.ink}>{title}</Text>
        {subtitle ? <Text variant="caption" color={AR_COLORS.muted}>{subtitle}</Text> : null}
      </View>
      <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={6}>
        <Ionicons name="close" size={18} color={AR_COLORS.ink} />
      </Pressable>
    </View>
  );
}

function PrimaryButton({ label, icon, onPress, disabled, loading }: { label: string; icon?: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={[styles.primary, (disabled || loading) && { opacity: 0.45 }]} accessibilityRole="button" accessibilityState={{ disabled: !!disabled, busy: !!loading }}>
      {loading ? <ActivityIndicator color="#FFFFFF" /> : icon ? <Ionicons name={icon} size={18} color="#FFFFFF" /> : null}
      <Text variant="button" color="#FFFFFF">{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, icon, onPress, tone = 'default' }: { label: string; icon?: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void; tone?: 'default' | 'danger' }) {
  const color = tone === 'danger' ? '#C23B2A' : AR_COLORS.ink;
  return (
    <Pressable onPress={onPress} style={styles.secondary} accessibilityRole="button">
      {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
      <Text variant="button" color={color}>{label}</Text>
    </Pressable>
  );
}

function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, focused && styles.fieldFocused]}>
      <Text variant="caption" color={focused ? AR_COLORS.brand : AR_COLORS.muted} style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        placeholderTextColor="#9AA09A"
        style={[styles.fieldInput, props.style]}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** Rename a row, correct its value by typing, or delete it. */
type EditSheetProps = {
  measurement: Measurement | null;
  unit: MeasureUnit;
  onClose: () => void;
  onSave: (name: string, value: number) => void;
  onDelete: () => void;
};

export function EditMeasurementSheet(props: EditSheetProps) {
  if (!props.measurement) return null;
  // Remount per row/unit so the fields start from that row's values.
  return <EditMeasurementForm key={`${props.measurement.id}:${props.unit}`} {...props} measurement={props.measurement} />;
}

function EditMeasurementForm({ measurement, unit, onClose, onSave, onDelete }: EditSheetProps & { measurement: Measurement }) {
  const { t } = useI18n();
  const [name, setName] = useState(measurement.name);
  const [value, setValue] = useState(() => (measurement.kind === 'area' ? areaToInput(measurement.value, unit) : lengthToInput(measurement.value, unit)));
  const parsed = measurement.kind === 'area' ? parseArea(value, unit) : parseLength(value, unit);
  return (
    <BottomSheet visible onClose={onClose} dragHandleOnly>
      <View style={styles.body}>
        <SheetHeader title={t('arTools.measure.editTitle')} subtitle={measurement.source === 'manual' ? t('arTools.measure.rowTyped') : t('arTools.measure.editSubtitle')} onClose={onClose} />
        <Field label={t('arTools.measure.nameLabel')} value={name} onChangeText={setName} placeholder={measurementName({ ...measurement, name: '' }, t)} maxLength={60} />
        <Field label={measurement.kind === 'area' ? t('arTools.measure.areaLabel', { unit: unit === 'ftIn' ? 'ft²' : 'm²' }) : t('arTools.measure.lengthLabel', { unit: t(`arTools.measure.unitShort.${unit}`) })} value={value} onChangeText={setValue} keyboardType={unit === 'ftIn' && measurement.kind === 'line' ? 'default' : 'decimal-pad'} />
        {value && !parsed ? <Text variant="caption" color="#C23B2A">{t('arTools.measure.invalidValue')}</Text> : null}
        <PrimaryButton label={t('common.save')} icon="checkmark" disabled={!parsed} onPress={() => parsed && onSave(name, parsed)} />
        <SecondaryButton label={t('common.delete')} icon="trash-outline" tone="danger" onPress={onDelete} />
      </View>
    </BottomSheet>
  );
}

/** Type a length or area in by hand (no AR, or low accuracy). */
type ManualEntryProps = {
  visible: boolean;
  unit: MeasureUnit;
  onClose: () => void;
  onAdd: (kind: Measurement['kind'], name: string, value: number) => void;
};

export function ManualEntrySheet(props: ManualEntryProps) {
  if (!props.visible) return null;
  return <ManualEntryForm {...props} />;
}

function ManualEntryForm({ unit, onClose, onAdd }: ManualEntryProps) {
  const { t } = useI18n();
  const [kind, setKind] = useState<Measurement['kind']>('line');
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const parsed = kind === 'area' ? parseArea(value, unit) : parseLength(value, unit);
  return (
    <BottomSheet visible onClose={onClose} dragHandleOnly>
      <View style={styles.body}>
        <SheetHeader title={t('arTools.measure.manualTitle')} subtitle={t('arTools.measure.manualSubtitle')} onClose={onClose} />
        <View style={styles.segment}>
          {(['line', 'area'] as const).map((k) => (
            <Pressable key={k} onPress={() => setKind(k)} style={[styles.segmentItem, kind === k && styles.segmentActive]} accessibilityRole="radio" accessibilityState={{ checked: kind === k }}>
              <Text variant="label" color={kind === k ? '#FFFFFF' : AR_COLORS.ink}>{t(k === 'line' ? 'arTools.measure.kindLength' : 'arTools.measure.kindArea')}</Text>
            </Pressable>
          ))}
        </View>
        <Field label={t('arTools.measure.nameLabel')} value={name} onChangeText={setName} placeholder={t('arTools.measure.namePlaceholder')} maxLength={60} />
        <Field label={kind === 'area' ? t('arTools.measure.areaLabel', { unit: unit === 'ftIn' ? 'ft²' : 'm²' }) : t('arTools.measure.lengthLabel', { unit: t(`arTools.measure.unitShort.${unit}`) })} value={value} onChangeText={setValue} keyboardType={unit === 'ftIn' && kind === 'line' ? 'default' : 'decimal-pad'} placeholder={kind === 'line' ? (unit === 'ftIn' ? '6\' 8"' : lengthToInput(2.04, unit)) : areaToInput(1.55, unit)} />
        {value && !parsed ? <Text variant="caption" color="#C23B2A">{t('arTools.measure.invalidValue')}</Text> : null}
        <PrimaryButton label={t('arTools.measure.addMeasurement')} icon="add" disabled={!parsed} onPress={() => { if (parsed) { onAdd(kind, name, parsed); setName(''); setValue(''); } }} />
      </View>
    </BottomSheet>
  );
}

/** Preview + job + caption + dimension table, then add the photo to the job. */
type SaveToReportProps = {
  visible: boolean;
  previewUri: string | null;
  loadingPreview: boolean;
  jobLabel: string;
  defaultCaption: string;
  includeTable: boolean;
  onToggleTable: (value: boolean) => void;
  onClose: () => void;
  onSubmit: (caption: string) => Promise<void>;
};

export function SaveToReportSheet(props: SaveToReportProps) {
  if (!props.visible) return null;
  return <SaveToReportForm {...props} />;
}

function SaveToReportForm({ previewUri, loadingPreview, jobLabel, defaultCaption, includeTable, onToggleTable, onClose, onSubmit }: SaveToReportProps) {
  const { t } = useI18n();
  const [caption, setCaption] = useState(defaultCaption);
  const [saving, setSaving] = useState(false);
  return (
    <BottomSheet visible onClose={saving ? () => undefined : onClose} dragHandleOnly>
      <View style={styles.body}>
        <SheetHeader title={t('arTools.measure.saveTitle')} subtitle={t('arTools.measure.saveSubtitle')} onClose={onClose} />
        <View style={styles.preview}>
          {previewUri ? <Image source={{ uri: previewUri }} style={styles.previewImage} contentFit="contain" accessibilityLabel={t('arTools.measure.previewA11y')} /> : loadingPreview ? <ActivityIndicator /> : <Ionicons name="image-outline" size={28} color={AR_COLORS.muted} />}
          <Text variant="caption" color={AR_COLORS.muted}>{t('arTools.measure.previewHint')}</Text>
        </View>
        <View style={styles.jobRow}>
          <Ionicons name="briefcase-outline" size={18} color={AR_COLORS.muted} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={AR_COLORS.muted} style={styles.fieldLabel}>{t('arTools.measure.jobLabel')}</Text>
            <Text variant="bodyMedium" color={AR_COLORS.ink} numberOfLines={1}>{jobLabel}</Text>
          </View>
        </View>
        <Field label={t('arTools.measure.captionLabel')} value={caption} onChangeText={setCaption} multiline maxLength={500} style={{ minHeight: 44 }} />
        <View style={styles.toggleRow}>
          <Text variant="body" color={AR_COLORS.ink} style={{ flex: 1 }}>{t('arTools.measure.includeTable')}</Text>
          <Switch value={includeTable} onValueChange={onToggleTable} trackColor={{ true: AR_COLORS.brand, false: '#D5D8D5' }} accessibilityLabel={t('arTools.measure.includeTable')} />
        </View>
        <PrimaryButton
          label={saving ? t('common.saving') : t('arTools.measure.addToReport')}
          icon="document-attach-outline"
          loading={saving}
          disabled={!previewUri}
          onPress={async () => {
            setSaving(true);
            try { await onSubmit(caption); } finally { setSaving(false); }
          }}
        />
      </View>
    </BottomSheet>
  );
}

/** Honest accuracy note for phones without LiDAR, with a one-tap way out. */
export function LowAccuracySheet({ visible, onClose, onTypeInstead, onMeasureAnyway }: { visible: boolean; onClose: () => void; onTypeInstead: () => void; onMeasureAnyway: () => void }) {
  const { t } = useI18n();
  if (!visible) return null;
  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.body}>
        <Text variant="h3" color={AR_COLORS.ink}>{t('arTools.measure.lowTitle')}</Text>
        <Text variant="bodySmall" color={AR_COLORS.muted}>{t('arTools.measure.lowBody')}</Text>
        <View style={styles.compare}>
          <View style={[styles.compareCard, { backgroundColor: AR_COLORS.rowSelected }]}>
            <Text variant="caption" color={AR_COLORS.brand}>{t('arTools.measure.lidarPhones')}</Text>
            <Text variant="h2" color={AR_COLORS.ink}>±1 cm</Text>
            <Text variant="caption" color={AR_COLORS.muted}>{t('arTools.measure.lidarPhonesHint')}</Text>
          </View>
          <View style={[styles.compareCard, styles.compareThis]}>
            <Text variant="caption" color="#9A5B00">{t('arTools.measure.thisPhone')}</Text>
            <Text variant="h2" color={AR_COLORS.ink}>~±3 cm</Text>
            <Text variant="caption" color={AR_COLORS.muted}>{t('arTools.measure.cameraOnly')}</Text>
          </View>
        </View>
        <SecondaryButton label={t('arTools.measure.typeInstead')} icon="keypad-outline" onPress={onTypeInstead} />
        <PrimaryButton label={t('arTools.measure.measureAnyway')} onPress={onMeasureAnyway} />
      </View>
    </BottomSheet>
  );
}

export function MeasureHelpSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useI18n();
  if (!visible) return null;
  const tips = ['tipScan', 'tipPlace', 'tipClose', 'tipEdit', 'tipSave'] as const;
  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.body}>
        <SheetHeader title={t('arTools.measure.helpTitle')} onClose={onClose} />
        {tips.map((tip, i) => (
          <View key={tip} style={styles.tip}>
            <View style={styles.tipNum}><Text variant="caption" color="#FFFFFF">{i + 1}</Text></View>
            <Text variant="bodySmall" color={AR_COLORS.ink} style={{ flex: 1 }}>{t(`arTools.measure.${tip}`)}</Text>
          </View>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingTop: 4 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF0EE' },
  primary: { height: 52, borderRadius: 999, backgroundColor: AR_COLORS.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondary: { height: 52, borderRadius: 999, borderWidth: 1.5, borderColor: '#D9DCD9', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  field: { borderRadius: 14, borderWidth: 1.5, borderColor: '#D9DCD9', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10 },
  fieldFocused: { borderColor: AR_COLORS.brand },
  fieldLabel: { textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 },
  fieldInput: { fontFamily: 'Lexend_400Regular', fontSize: 16, color: AR_COLORS.ink, paddingVertical: 2 },
  segment: { flexDirection: 'row', padding: 3, borderRadius: 999, backgroundColor: '#EEF0EE', alignSelf: 'flex-start' },
  segmentItem: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  segmentActive: { backgroundColor: AR_COLORS.ink },
  preview: { height: 190, borderRadius: 16, backgroundColor: '#EEF0EE', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 },
  previewImage: { width: '100%', flex: 1, borderRadius: 8 },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#D9DCD9' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  compare: { flexDirection: 'row', gap: 10 },
  compareCard: { flex: 1, padding: 12, borderRadius: 14, gap: 2 },
  compareThis: { backgroundColor: '#FFF4E0', borderWidth: 1.5, borderColor: AR_COLORS.warning },
  tip: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: AR_COLORS.brand, alignItems: 'center', justifyContent: 'center' },
});

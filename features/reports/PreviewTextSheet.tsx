import React, { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet, Button, Input, Text, TextArea } from '@/components';
import { jobsRepository, workSummaryRepository } from '@/database';
import { useI18n } from '@/i18n/useI18n';
import type { JobDraft } from '@/models';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import type { ReportPreviewTextField } from './previewEdit';

type PreviewTextSheetProps = {
  visible: boolean;
  jobId: string;
  field: ReportPreviewTextField | null;
  values: Partial<Record<ReportPreviewTextField, string>>;
  onClose: () => void;
  onSaved: () => void;
};

const FIELD_ORDER: ReportPreviewTextField[] = [
  'title',
  'customer',
  'address',
  'description',
  'work',
  'materials',
  'recommendations',
];

const JOB_FIELDS: ReportPreviewTextField[] = ['title', 'customer', 'address', 'description'];

/** Bottom tray for editing report copy tapped in the live preview. */
export function PreviewTextSheet({
  visible,
  jobId,
  field,
  values,
  onClose,
  onSaved,
}: PreviewTextSheetProps) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [active, setActive] = useState<ReportPreviewTextField>('title');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible || !field) return;
    setActive(field);
    setDraft(values[field] ?? '');
  }, [visible, field, values]);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [visible]);

  const label = useMemo(() => {
    switch (active) {
      case 'title':
        return t('preview.textFieldTitle');
      case 'customer':
        return t('preview.textFieldCustomer');
      case 'address':
        return t('preview.textFieldAddress');
      case 'description':
        return t('preview.textFieldDescription');
      case 'work':
        return t('preview.textFieldWork');
      case 'materials':
        return t('preview.textFieldMaterials');
      case 'recommendations':
        return t('preview.textFieldRecommendations');
      default:
        return t('preview.textSheetTitle');
    }
  }, [active, t]);

  const chooseField = (next: ReportPreviewTextField) => {
    setActive(next);
    setDraft(values[next] ?? '');
  };

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const trimmed = draft.trim();
      if (JOB_FIELDS.includes(active)) {
        const patch: Partial<JobDraft> = {};
        if (active === 'title') patch.title = trimmed || values.title || 'Job';
        else if (active === 'customer') patch.customerName = trimmed;
        else if (active === 'address') patch.address = trimmed;
        else patch.description = trimmed;
        await jobsRepository.updateJob(jobId, patch);
      } else {
        const key =
          active === 'work'
            ? 'workCompleted'
            : active === 'materials'
              ? 'materials'
              : 'recommendations';
        await workSummaryRepository.saveWorkSummary(jobId, { [key]: trimmed });
      }
      onSaved();
      onClose();
    } catch (error) {
      logger.error('Failed to save preview text', error);
    } finally {
      setBusy(false);
    }
  };

  const sheetMax = Math.max(360, windowHeight - keyboardHeight - insets.top - 12);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      dragHandleOnly
      maxHeight={sheetMax}
      bottomOffset={keyboardHeight}
    >
      <View style={[styles.head, { paddingHorizontal: spacing.md }]}>
        <Text variant="h3" color={colors.textPrimary}>
          {t('preview.textSheetTitle')}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {t('preview.textSheetHint')}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.chips, { paddingHorizontal: spacing.md, gap: spacing.xs }]}
        keyboardShouldPersistTaps="handled"
      >
        {FIELD_ORDER.map((id) => {
          const selected = id === active;
          return (
            <Pressable
              key={id}
              onPress={() => chooseField(id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                {
                  borderRadius: 999,
                  backgroundColor: selected ? colors.accentSoft : colors.surfaceSunken,
                  borderColor: selected ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                variant="caption"
                color={selected ? '#127A36' : colors.textSecondary}
                style={{ fontWeight: selected ? '700' : '500' }}
              >
                {chipLabel(id, t)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.md }}>
        {active === 'title' || active === 'customer' ? (
          <Input label={label} value={draft} onChangeText={setDraft} autoFocus />
        ) : (
          <TextArea label={label} value={draft} onChangeText={setDraft} minHeight={140} autoFocus />
        )}
        <View style={{ paddingBottom: Math.max(insets.bottom, 12), gap: spacing.sm }}>
          <Button label={busy ? t('preview.savingText') : t('preview.saveText')} onPress={() => void save()} />
          <Button label={t('preview.done')} variant="tertiary" onPress={onClose} />
        </View>
      </View>
    </BottomSheet>
  );
}

function chipLabel(id: ReportPreviewTextField, t: ReturnType<typeof useI18n>['t']): string {
  switch (id) {
    case 'title':
      return t('preview.textFieldTitle');
    case 'customer':
      return t('preview.textFieldCustomer');
    case 'address':
      return t('preview.textFieldAddress');
    case 'description':
      return t('preview.textFieldDescription');
    case 'work':
      return t('preview.textFieldWork');
    case 'materials':
      return t('preview.textFieldMaterials');
    case 'recommendations':
      return t('preview.textFieldRecommendations');
  }
}

const styles = StyleSheet.create({
  head: {
    gap: 4,
    marginBottom: 10,
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

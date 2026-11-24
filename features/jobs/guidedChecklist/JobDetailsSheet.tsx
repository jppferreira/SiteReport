import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { BottomSheet, Modal, Text } from '@/components';
import { jobsRepository } from '@/database';
import { JobCalendar } from '@/features/jobs/MonthCalendar';
import { LayoutThumb } from '@/features/reports/LayoutThumb';
import { useI18n } from '@/i18n/useI18n';
import type { Job } from '@/models';
import { isPremiumTradeTemplate } from '@/models';
import { reportTemplateLabel } from '@/services/pdfService';
import { getPreferences, savePreferences } from '@/services/preferencesService';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';
import { formatDate } from '@/utils/format';
import { validateJobTitle } from '@/utils/validation';

import {
  JOB_TRADE_IDS,
  type JobTradeId,
  normalizeJobTradeId,
  suggestionForTrade,
  tradeLabelKey,
} from './jobTrades';

type JobDetailsSheetProps = {
  visible: boolean;
  job: Job;
  onClose: () => void;
  /** After a successful save — typically open the photos tools screen. */
  onSavedContinue: () => void;
  onChangeTemplate: () => void;
};

type Draft = {
  title: string;
  customerName: string;
  address: string;
  jobDate: string;
  referenceNumber: string;
};

/** Figma 04 — Job details bottom sheet over the guided checklist. */
export function JobDetailsSheet({
  visible,
  job,
  onClose,
  onSavedContinue,
  onChangeTemplate,
}: JobDetailsSheetProps) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { height: windowHeight } = useWindowDimensions();
  const customerRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const [draft, setDraft] = useState<Draft>({
    title: job.title,
    customerName: job.customerName ?? '',
    address: job.address ?? '',
    jobDate: job.jobDate,
    referenceNumber: job.referenceNumber ?? '',
  });
  const [trade, setTrade] = useState<JobTradeId | null>(null);
  const [focused, setFocused] = useState<keyof Draft | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setDraft({
      title: job.title,
      customerName: job.customerName ?? '',
      address: job.address ?? '',
      jobDate: job.jobDate,
      referenceNumber: job.referenceNumber ?? '',
    });
    setTitleError(null);
    setFocused(null);
    getPreferences().then((prefs) => setTrade(normalizeJobTradeId(prefs.lastJobTrade)));
  }, [visible, job]);

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

  const suggestion = useMemo(() => suggestionForTrade(trade), [trade]);
  const templateFree = !isPremiumTradeTemplate(suggestion.templateId);
  const tradeLabel = trade && trade !== 'more' ? t(tradeLabelKey(trade)) : t('jobDetail.guided.sheet.trades.kitchens');

  const patch = (key: keyof Draft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (key === 'title') {
      const validation = validateJobTitle(value);
      setTitleError(validation.valid ? null : validation.message);
    }
  };

  const handleSave = async () => {
    const validation = validateJobTitle(draft.title);
    if (!validation.valid) {
      setTitleError(validation.message);
      return;
    }
    setSaving(true);
    try {
      await jobsRepository.updateJob(job.id, {
        title: draft.title.trim(),
        customerName: draft.customerName.trim(),
        address: draft.address.trim(),
        jobDate: draft.jobDate,
        referenceNumber: draft.referenceNumber.trim(),
      });
      await savePreferences({
        lastJobTrade: trade,
        reportTemplate: suggestion.templateId,
      });
      onSavedContinue();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      dragHandleOnly
      maxHeight={windowHeight * 0.9}
      bottomOffset={keyboardHeight > 0 ? Math.max(0, keyboardHeight - 24) : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerTitles}>
          <Text
            variant="caption"
            color={colors.accent}
            style={{ fontFamily: fontFamily.semibold, letterSpacing: 0.88, fontSize: 11 }}
          >
            {t('jobDetail.guided.sheet.stepOf', { step: 1, total: 7 })}
          </Text>
          <Text variant="h2" style={{ fontSize: 22, lineHeight: 28, fontFamily: fontFamily.bold }}>
            {t('jobDetail.guided.steps.details.title')}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={[styles.closeBtn, { backgroundColor: colors.surfaceSunken }]}
          hitSlop={8}
        >
          <Ionicons name="close" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 14, paddingBottom: spacing.md }}
      >
        <View style={{ gap: 8 }}>
          <SheetField
            label={t('edit.jobTitle')}
            value={draft.title}
            onChangeText={(v) => patch('title', v)}
            focused={focused === 'title'}
            onFocus={() => setFocused('title')}
            onBlur={() => setFocused(null)}
            error={titleError}
          />
          <SheetField
            ref={customerRef}
            label={t('edit.customerName')}
            value={draft.customerName}
            onChangeText={(v) => patch('customerName', v)}
            focused={focused === 'customerName'}
            onFocus={() => setFocused('customerName')}
            onBlur={() => setFocused(null)}
            trailing={
              <Pressable
                onPress={() => customerRef.current?.focus()}
                accessibilityRole="button"
                accessibilityLabel={t('jobDetail.guided.sheet.contacts')}
                style={styles.trailingRow}
                hitSlop={6}
              >
                <Ionicons name="people-outline" size={16} color={colors.accent} />
                <Text variant="caption" color={colors.accent} style={{ fontFamily: fontFamily.semibold, fontSize: 12 }}>
                  {t('jobDetail.guided.sheet.contacts')}
                </Text>
              </Pressable>
            }
          />
          <SheetField
            label={t('edit.address')}
            value={draft.address}
            onChangeText={(v) => patch('address', v)}
            focused={focused === 'address'}
            onFocus={() => setFocused('address')}
            onBlur={() => setFocused(null)}
            trailing={<Ionicons name="location-outline" size={16} color={colors.accent} />}
          />
          <View style={styles.row2}>
            <Pressable
              onPress={() => setDateOpen(true)}
              style={[styles.field, styles.half, { backgroundColor: colors.surfaceSunken }]}
              accessibilityRole="button"
              accessibilityLabel={`${t('edit.date')}: ${formatDate(draft.jobDate)}`}
            >
              <Text variant="caption" color={colors.textTertiary} style={{ fontSize: 11 }}>
                {t('edit.date')}
              </Text>
              <Text variant="body" style={{ fontSize: 15, fontFamily: fontFamily.medium }}>
                {formatDate(draft.jobDate)}
              </Text>
            </Pressable>
            <SheetField
              label={t('edit.referenceNumber')}
              value={draft.referenceNumber}
              onChangeText={(v) => patch('referenceNumber', v)}
              focused={focused === 'referenceNumber'}
              onFocus={() => setFocused('referenceNumber')}
              onBlur={() => setFocused(null)}
              style={styles.half}
            />
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <View style={styles.tradeLabelRow}>
            <Text variant="body" style={{ fontFamily: fontFamily.semibold, fontSize: 15 }}>
              {t('jobDetail.guided.sheet.whatKind')}
            </Text>
            <Text variant="caption" color={colors.textTertiary} style={{ fontSize: 11 }}>
              {t('jobDetail.guided.sheet.remembered')}
            </Text>
          </View>
          <View style={styles.chips}>
            {JOB_TRADE_IDS.map((id) => {
              const selected = trade === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setTrade(id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.chip,
                    selected
                      ? { backgroundColor: colors.ctaDark }
                      : { backgroundColor: colors.surface, borderColor: colors.borderStrong, borderWidth: 1 },
                  ]}
                >
                  {selected ? <Ionicons name="checkmark" size={13} color={colors.textInverse} /> : null}
                  <Text
                    variant="caption"
                    color={selected ? colors.textInverse : colors.textPrimary}
                    style={{ fontFamily: fontFamily.medium, fontSize: 13 }}
                  >
                    {t(tradeLabelKey(id))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.suggestion, { backgroundColor: colors.accentSoft }]}>
          <View style={styles.suggestionHead}>
            <View style={styles.trailingRow}>
              <Ionicons name="sparkles" size={15} color={colors.accentPressed} />
              <Text
                variant="caption"
                color={colors.accentPressed}
                style={{ fontFamily: fontFamily.semibold, fontSize: 13 }}
              >
                {t('jobDetail.guided.sheet.suggestedFor', { trade: tradeLabel })}
              </Text>
            </View>
            <Pressable onPress={onChangeTemplate} hitSlop={8} accessibilityRole="button">
              <Text variant="caption" color={colors.accent} style={{ fontFamily: fontFamily.semibold, fontSize: 13 }}>
                {t('checklist.change')}
              </Text>
            </Pressable>
          </View>
          <View style={styles.suggestionBody}>
            <View style={[styles.miniThumb, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <LayoutThumb template={suggestion.templateId} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.trailingRow}>
                <Text variant="body" style={{ fontFamily: fontFamily.semibold, fontSize: 15 }}>
                  {reportTemplateLabel(suggestion.templateId)}
                </Text>
                {templateFree ? (
                  <View style={[styles.freeChip, { backgroundColor: colors.surface }]}>
                    <Text
                      variant="caption"
                      color={colors.accentPressed}
                      style={{ fontFamily: fontFamily.semibold, fontSize: 10 }}
                    >
                      {t('jobDetail.guided.free')}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.proChip, { backgroundColor: colors.ctaDark }]}>
                    <Ionicons name="lock-closed" size={9} color={colors.textInverse} />
                    <Text
                      variant="caption"
                      color={colors.textInverse}
                      style={{ fontFamily: fontFamily.bold, fontSize: 9 }}
                    >
                      {t('common.proBadge')}
                    </Text>
                  </View>
                )}
              </View>
              <Text variant="caption" color={colors.textSecondary} style={{ fontSize: 12, lineHeight: 16 }}>
                {t(suggestion.blurbKey)}
              </Text>
              {suggestion.checklistKey ? (
                <View style={styles.trailingRow}>
                  <Ionicons name="list-outline" size={13} color={colors.textPrimary} />
                  <Text variant="caption" style={{ fontFamily: fontFamily.medium, fontSize: 12, flexShrink: 1 }}>
                    {t(suggestion.checklistKey)}
                  </Text>
                  <View style={[styles.proChip, { backgroundColor: colors.ctaDark }]}>
                    <Ionicons name="lock-closed" size={9} color={colors.textInverse} />
                    <Text
                      variant="caption"
                      color={colors.textInverse}
                      style={{ fontFamily: fontFamily.bold, fontSize: 9 }}
                    >
                      {t('common.proBadge')}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={{ gap: 8, paddingTop: 2 }}>
          <Pressable
            onPress={() => void handleSave()}
            disabled={saving}
            accessibilityRole="button"
            style={[styles.primaryBtn, { backgroundColor: colors.ctaDark, opacity: saving ? 0.7 : 1 }]}
          >
            <Text variant="body" color={colors.textInverse} style={{ fontFamily: fontFamily.semibold, fontSize: 15 }}>
              {t('jobDetail.guided.sheet.saveAddPhotos')}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
          </Pressable>
          <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', fontSize: 11 }}>
            {t('jobDetail.guided.sheet.changeLater')}
          </Text>
        </View>
      </ScrollView>

      <Modal visible={dateOpen} onRequestClose={() => setDateOpen(false)}>
        <View style={[styles.dateCard, { backgroundColor: colors.surface }]}>
          <JobCalendar
            value={draft.jobDate}
            onSelect={(next) => {
              patch('jobDate', next);
              setDateOpen(false);
            }}
          />
        </View>
      </Modal>
    </BottomSheet>
  );
}

type SheetFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  trailing?: React.ReactNode;
  error?: string | null;
  style?: object;
};

const SheetField = React.forwardRef<React.ElementRef<typeof TextInput>, SheetFieldProps>(function SheetField(
  { label, value, onChangeText, focused, onFocus, onBlur, trailing, error, style },
  ref
) {
  const { colors } = useTheme();
  const borderColor = error ? colors.destructive : focused ? colors.accent : 'transparent';
  const borderWidth = error || focused ? 1.5 : 0;

  return (
    <View style={[{ flex: style ? undefined : undefined }, style]}>
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.surfaceSunken,
            borderColor,
            borderWidth,
          },
        ]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" color={colors.textTertiary} style={{ fontSize: 11 }}>
            {label}
          </Text>
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.textPrimary, fontFamily: fontFamily.medium }]}
          />
        </View>
        {trailing}
      </View>
      {error ? (
        <Text variant="caption" color={colors.destructive} style={{ marginTop: 4, fontSize: 11 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitles: {
    gap: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    fontSize: 15,
    lineHeight: 20,
    padding: 0,
    margin: 0,
  },
  row2: {
    flexDirection: 'row',
    gap: 8,
  },
  half: {
    flex: 1,
  },
  tradeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
  },
  suggestion: {
    borderRadius: 16,
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  suggestionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  miniThumb: {
    width: 56,
    height: 76,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
  },
  freeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  proChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 100,
  },
  trailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  dateCard: {
    borderRadius: 16,
    padding: 16,
    width: '100%',
  },
});

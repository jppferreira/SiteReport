import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavigationHeader, Screen, Text, TextArea, TextButton } from '@/components';
import { CostsDocumentCard } from '@/features/jobs/CostsDocumentCard';
import { PricingReferenceHandle } from '@/features/jobs/PricingReference';
import { VoiceReportSheet } from '@/features/voiceReport/VoiceReportSheet';
import { useVoiceReport } from '@/features/voiceReport/useVoiceReport';
import { useAutosaveField } from '@/hooks/useAutosaveField';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useJob } from '@/hooks/useJob';
import { useWorkSummary } from '@/hooks/useWorkSummary';
import { useI18n } from '@/i18n/useI18n';
import {
  DEFAULT_DOCUMENT_TYPE,
  DocumentType,
  EMPTY_PRICING,
  formatInvoiceNumber,
  ReportPricing,
} from '@/models';
import type { VoiceFieldSnapshot } from '@/services/voiceReport';
import { useTheme } from '@/theme';
import { goBack } from '@/utils/goBack';

export default function WorkSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { isPro } = useEntitlement();
  const { job } = useJob(id);
  const { profile } = useBusinessProfile();
  const { summary, loading, save } = useWorkSummary(id);
  const voice = useVoiceReport();
  const [undo, setUndo] = useState<VoiceFieldSnapshot | null>(null);

  const workCompleted = useAutosaveField(summary?.workCompleted ?? '', async (value) => {
    await save({ workCompleted: value });
  });
  const materials = useAutosaveField(summary?.materials ?? '', async (value) => {
    await save({ materials: value });
  });
  const recommendations = useAutosaveField(summary?.recommendations ?? '', async (value) => {
    await save({ recommendations: value });
  });
  const notes = useAutosaveField(summary?.notes ?? '', async (value) => {
    await save({ notes: value });
  });
  const pricingRef = useRef<PricingReferenceHandle>(null);
  const pricingSnapshot = useRef<ReportPricing>(summary?.pricing ?? EMPTY_PRICING);

  useEffect(() => {
    if (summary?.pricing) pricingSnapshot.current = summary.pricing;
  }, [summary?.pricing]);

  const savePricing = useCallback(
    async (pricing: ReportPricing) => {
      pricingSnapshot.current = pricing;
      const next = await save({ pricing });
      pricingSnapshot.current = next.pricing;
      return next.pricing;
    },
    [save]
  );

  const documentType = summary?.documentType ?? DEFAULT_DOCUMENT_TYPE;

  const saveDocumentType = useCallback(
    async (next: DocumentType) => {
      await save({ documentType: next });
    },
    [save]
  );

  const currentSnapshot = (): VoiceFieldSnapshot => ({
    workCompleted: workCompleted.value,
    materials: materials.value,
    recommendations: recommendations.value,
    notes: notes.value,
    pricing: pricingSnapshot.current,
  });

  const openVoice = () => {
    if (!isPro) {
      router.push({ pathname: '/paywall', params: { trigger: 'voice_notes' } });
      return;
    }
    void voice.open(currentSnapshot());
  };

  const applyVoiceFill = (which: 'transcript' | 'professional') => {
    const session = voice.getSession();
    if (!session || session.phase !== 'readyToReview') return false;
    const fill = voice.approve(which, 'replace');
    if (!fill) return false;

    setUndo(session.previousFields);

    if (fill.workCompleted != null) {
      workCompleted.onChange(fill.workCompleted);
      void workCompleted.flush();
    }
    if (fill.materials != null) {
      materials.onChange(fill.materials);
      void materials.flush();
    }
    if (fill.recommendations != null) {
      recommendations.onChange(fill.recommendations);
      void recommendations.flush();
    }
    if (fill.notes != null) {
      notes.onChange(fill.notes);
      void notes.flush();
    }
    if (fill.pricing != null) {
      pricingRef.current?.applyPricing(fill.pricing);
    }

    void voice.close();
    return true;
  };

  const stopAndReview = async () => {
    await voice.stopAndTranscribe();
  };

  const undoInsert = () => {
    if (!undo) return;
    workCompleted.onChange(undo.workCompleted);
    materials.onChange(undo.materials);
    recommendations.onChange(undo.recommendations);
    notes.onChange(undo.notes);
    void workCompleted.flush();
    void materials.flush();
    void recommendations.flush();
    void notes.flush();
    pricingRef.current?.applyPricing(undo.pricing);
    setUndo(null);
  };

  const leave = async () => {
    await Promise.all([
      workCompleted.flush(),
      materials.flush(),
      recommendations.flush(),
      notes.flush(),
      pricingRef.current?.flush(),
    ]);
    goBack(`/job/${id}`);
  };

  const tidiedReady = useMemo(() => {
    return Boolean(
      workCompleted.value.trim() || materials.value.trim() || recommendations.value.trim()
    );
  }, [workCompleted.value, materials.value, recommendations.value]);

  const jobLabel = useMemo(() => {
    if (!job) return '';
    const bits = [job.title, job.address].filter((v) => v && v.trim());
    return bits.join(' — ');
  }, [job]);

  if (loading) {
    return (
      <Screen>
        <NavigationHeader title={t('summary.title')} onBack={() => goBack(`/job/${id}`)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <NavigationHeader
        title={t('summary.title')}
        onBack={() => void leave()}
        right={<TextButton label={t('summary.save')} tone="accent" onPress={() => void leave()} />}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.xl + 88,
            gap: spacing.md,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {jobLabel ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View
                style={{
                  backgroundColor: colors.accentSoft,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Text variant="caption" color={colors.accent} style={{ fontWeight: '700', letterSpacing: 0.8 }}>
                  {t('summary.jobPill')}
                </Text>
              </View>
              <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={2}>
                {jobLabel}
              </Text>
            </View>
          ) : null}

          {tidiedReady ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.lg,
                padding: spacing.md,
                gap: spacing.sm,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name="sparkles" size={17} color={colors.accent} />
                <Text variant="bodyMedium" style={{ flex: 1 }}>
                  {t('summary.tidiedTitle')}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: colors.accentSoft,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <Ionicons name="checkmark" size={12} color={colors.accent} />
                  <Text variant="caption" color={colors.accent} style={{ fontWeight: '700' }}>
                    {t('summary.readyForPdf')}
                  </Text>
                </View>
              </View>
              {workCompleted.value.trim() ? (
                <NoteBlock title={t('summary.fieldSummary')} body={workCompleted.value} />
              ) : null}
              {materials.value.trim() ? (
                <NoteBlock title={t('summary.fieldMaterialsShort')} body={materials.value} />
              ) : null}
              {recommendations.value.trim() ? (
                <NoteBlock title={t('summary.fieldLabourShort')} body={recommendations.value} />
              ) : null}
            </View>
          ) : null}

          <View>
            <TextArea
              label={t('summary.fieldSummary')}
              placeholder={t('summary.fieldSummaryPlaceholder')}
              value={workCompleted.value}
              onChangeText={workCompleted.onChange}
              onBlur={workCompleted.flush}
              minHeight={120}
            />
            <SaveStatus status={workCompleted.status} />
          </View>

          <View>
            <TextArea
              label={t('summary.fieldMaterials')}
              placeholder={t('summary.fieldMaterialsPlaceholder')}
              value={materials.value}
              onChangeText={materials.onChange}
              onBlur={materials.flush}
              minHeight={90}
            />
          </View>

          <View>
            <TextArea
              label={t('summary.fieldLabour')}
              placeholder={t('summary.fieldLabourPlaceholder')}
              value={recommendations.value}
              onChangeText={recommendations.onChange}
              onBlur={recommendations.flush}
              minHeight={90}
            />
          </View>

          <View>
            <TextArea
              label={t('summary.fieldPrivateNotes')}
              placeholder={t('summary.fieldPrivateNotesPlaceholder')}
              value={notes.value}
              onChangeText={notes.onChange}
              onBlur={notes.flush}
              minHeight={90}
            />
          </View>

          <Text variant="h3">{t('costs.sectionTitle')}</Text>
          <CostsDocumentCard
            pricing={summary?.pricing ?? EMPTY_PRICING}
            documentType={documentType}
            isPro={isPro}
            invoice={{
              invoiceNumber:
                summary?.invoiceNumber ??
                (documentType === 'invoice'
                  ? formatInvoiceNumber(profile?.nextInvoiceSequence ?? 1)
                  : null),
              dueDays: profile?.defaultDueDays ?? 14,
              jobDate: job?.jobDate ?? new Date().toISOString().slice(0, 10),
              bankName: profile?.bankName ?? null,
              sortCode: profile?.sortCode ?? null,
              accountNumber: profile?.accountNumber ?? null,
              paymentTerms: profile?.paymentTerms ?? null,
              hasVat: Boolean(profile?.vatNumber?.trim()),
            }}
            pricingRef={pricingRef}
            onSavePricing={savePricing}
            onChangeDocumentType={(next) => void saveDocumentType(next)}
            onLocked={() => router.push({ pathname: '/paywall', params: { trigger: 'quote_invoice' } })}
          />

          {undo ? (
            <TextButton label={t('voiceReport.undoInsert')} onPress={undoInsert} />
          ) : (
            <Text variant="caption" color={colors.textSecondary}>
              {t('voiceReport.summaryHint')}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          openVoice();
        }}
        accessibilityRole="button"
        accessibilityLabel={t('voiceReport.micA11y')}
        style={({ pressed }) => [
          styles.micFab,
          shadows.floating,
          {
            alignSelf: 'center',
            bottom: Math.max(insets.bottom, spacing.md) + spacing.sm,
            backgroundColor: pressed ? colors.ctaDarkPressed : colors.ctaDark,
            borderRadius: radius.pill,
            borderWidth: 4,
            borderColor: colors.surface,
          },
        ]}
      >
        <Ionicons name="mic" size={26} color={colors.textInverse} />
      </Pressable>

      <VoiceReportSheet
        visible={voice.visible}
        session={voice.session}
        onClose={() => void voice.close()}
        onStart={() => void voice.startRecording()}
        onPause={voice.pauseRecording}
        onResume={voice.resumeRecording}
        onStop={() => void stopAndReview()}
        onMakeProfessional={() => void voice.makeProfessional()}
        onChangeTranscript={voice.setTranscript}
        onRecordAgain={() => void voice.recordAgain()}
        onUseTranscript={() => {
          applyVoiceFill('transcript');
        }}
        onUseProfessional={() => {
          applyVoiceFill('professional');
        }}
      />
    </Screen>
  );
}

function NoteBlock({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  const items = body
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
  return (
    <View style={{ gap: 5 }}>
      <Text variant="bodyMedium">{title}</Text>
      {items.map((item) => (
        <View key={item} style={{ flexDirection: 'row', gap: 9 }}>
          <Text variant="body" color={colors.accent}>
            •
          </Text>
          <Text variant="body" style={{ flex: 1 }}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SaveStatus({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  if (status === 'idle') return null;
  return (
    <Text variant="caption" color={status === 'error' ? colors.destructive : colors.textSecondary} style={{ marginTop: 6 }}>
      {status === 'saving' ? t('summary.saving') : status === 'error' ? t('summary.saveError') : t('summary.saved')}
    </Text>
  );
}

const styles = StyleSheet.create({
  micFab: {
    position: 'absolute',
    zIndex: 3,
    left: '50%',
    marginLeft: -31,
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

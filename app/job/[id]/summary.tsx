import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { NavigationHeader, Screen, Text, TextArea, TextButton } from '@/components';
import { PricingReference, PricingReferenceHandle } from '@/features/jobs/PricingReference';
import { useAutosaveField } from '@/hooks/useAutosaveField';
import { useWorkSummary } from '@/hooks/useWorkSummary';
import { useI18n } from '@/i18n/useI18n';
import { EMPTY_PRICING, ReportPricing } from '@/models';
import { useTheme } from '@/theme';
import { goBack } from '@/utils/goBack';

export default function WorkSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { summary, loading, save } = useWorkSummary(id);

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
  const savePricing = useCallback(
    async (pricing: ReportPricing) => {
      const next = await save({ pricing });
      return next.pricing;
    },
    [save]
  );

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
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm }}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <TextArea
              label={t('summary.fieldSummary')}
              placeholder={t('summary.fieldSummaryPlaceholder')}
              value={workCompleted.value}
              onChangeText={workCompleted.onChange}
              onBlur={workCompleted.flush}
              minHeight={140}
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

          <PricingReference ref={pricingRef} pricing={summary?.pricing ?? EMPTY_PRICING} onSave={savePricing} />

          <Text variant="caption" color={colors.textSecondary}>
            {t('summary.speechHint')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
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

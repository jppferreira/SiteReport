import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { NavigationHeader, SegmentedControl, Screen, Text, ToggleRow } from '@/components';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useI18n } from '@/i18n/useI18n';
import { AppPreferences, DEFAULT_PREFERENCES, getPreferences, savePreferences } from '@/services/preferencesService';
import { useTheme } from '@/theme';

export default function PreferencesScreen() {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { isPro } = useEntitlement();
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getPreferences().then((value) => {
      setPreferences(value);
      setLoaded(true);
    });
  }, []);

  const update = async (patch: Partial<AppPreferences>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    await savePreferences(patch);
  };

  if (!loaded) return null;

  return (
    <Screen>
      <NavigationHeader title={t('preferences.title')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xl }}>
        <View>
          <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
            {t('preferences.defaultPhotoQuality')}
          </Text>
          <SegmentedControl
            segments={[
              { key: 'standard', label: t('preferences.qualityStandard') },
              { key: 'high', label: t('preferences.qualityHigh') },
            ]}
            value={preferences.defaultPhotoQuality}
            onChange={(key) => update({ defaultPhotoQuality: key as 'standard' | 'high' })}
          />
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
            {t('preferences.qualityHint')}
          </Text>
        </View>

        <View>
          <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
            {t('preferences.measureUnits')}
          </Text>
          <SegmentedControl
            segments={[
              { key: 'metric', label: t('preferences.measureMetric') },
              { key: 'imperial', label: t('preferences.measureImperial') },
            ]}
            value={preferences.measureUnit === 'ftIn' ? 'imperial' : 'metric'}
            onChange={(key) => update({ measureUnit: key === 'imperial' ? 'ftIn' : 'm' })}
          />
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
            {t('preferences.measureUnitsHint')}
          </Text>
        </View>

        <ToggleRow
          label={t('preferences.includeSignature')}
          description={t('preferences.includeSignatureDescription')}
          value={preferences.includeSignatureByDefault}
          onValueChange={(value) => update({ includeSignatureByDefault: value })}
        />

        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color={colors.textSecondary}>
            {t('stamp.sectionTitle')}
          </Text>
          <ToggleRow
            label={t('stamp.dateTime')}
            description={t('stamp.dateTimeHint')}
            value={preferences.stampDateTime}
            onValueChange={(value) => update({ stampDateTime: value })}
          />
          <ToggleRow
            label={t('stamp.address')}
            description={isPro ? t('stamp.addressHint') : t('stamp.addressProHint')}
            value={isPro && preferences.stampAddress}
            onValueChange={(value) => {
              if (!isPro) {
                router.push({ pathname: '/paywall', params: { trigger: 'stamp_address' } });
                return;
              }
              void update({ stampAddress: value });
            }}
          />
          <ToggleRow
            label={t('stamp.showOnPdf')}
            description={t('stamp.showOnPdfHint')}
            value={preferences.stampShowOnPdf}
            onValueChange={(value) => update({ stampShowOnPdf: value })}
          />
          <Text variant="caption" color={colors.textSecondary}>
            {t('stamp.privacy')}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

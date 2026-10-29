import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { NavigationHeader, SegmentedControl, Screen, Text, ToggleRow } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { AppPreferences, DEFAULT_PREFERENCES, getPreferences, savePreferences } from '@/services/preferencesService';
import { useTheme } from '@/theme';

export default function PreferencesScreen() {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
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

        <ToggleRow
          label={t('preferences.includeSignature')}
          description={t('preferences.includeSignatureDescription')}
          value={preferences.includeSignatureByDefault}
          onValueChange={(value) => update({ includeSignatureByDefault: value })}
        />
      </ScrollView>
    </Screen>
  );
}

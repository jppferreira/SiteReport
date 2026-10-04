import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { NavigationHeader, SegmentedControl, Screen, Text, ToggleRow } from '@/components';
import { AppPreferences, DEFAULT_PREFERENCES, getPreferences, savePreferences } from '@/services/preferencesService';
import { useTheme } from '@/theme';

export default function PreferencesScreen() {
  const { colors, spacing } = useTheme();
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
      <NavigationHeader title="Preferences" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xl }}>
        <View>
          <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
            DEFAULT PHOTO QUALITY
          </Text>
          <SegmentedControl
            segments={[
              { key: 'standard', label: 'Standard' },
              { key: 'high', label: 'High' },
            ]}
            value={preferences.defaultPhotoQuality}
            onChange={(key) => update({ defaultPhotoQuality: key as 'standard' | 'high' })}
          />
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
            Standard balances report quality with device storage. High keeps more detail for close-up work, using
            more space per job.
          </Text>
        </View>

        <ToggleRow
          label="Include signature step by default"
          description="Show the sign-off step as part of a new job's workflow."
          value={preferences.includeSignatureByDefault}
          onValueChange={(value) => update({ includeSignatureByDefault: value })}
        />
      </ScrollView>
    </Screen>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { setOnboardingComplete } from '@/services/preferencesService';
import { useTheme } from '@/theme';

const POINTS = [
  'Jobs are stored locally on this device.',
  'Photos stay on the device.',
  'Customer details are not uploaded.',
  'No account required.',
];

export default function OnboardingPrivacy() {
  const { colors, spacing } = useTheme();

  return (
    <OnboardingScreen
      step={1}
      totalSteps={3}
      illustration={
        <View style={{ alignItems: 'center', gap: spacing.md, width: '100%' }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="lock-closed" size={36} color={colors.accentPressed} />
          </View>
        </View>
      }
      title="Your work stays yours."
      description={
        <View style={{ gap: spacing.sm }}>
          {POINTS.map((point) => (
            <View key={point} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Ionicons name="checkmark" size={18} color={colors.accentPressed} style={{ marginTop: 3 }} />
              <Text variant="body" color={colors.textSecondary} style={{ flex: 1 }}>
                {point}
              </Text>
            </View>
          ))}
        </View>
      }
      ctaLabel="Continue"
      onCta={() => router.push('/onboarding/capture')}
      onSkip={async () => {
        await setOnboardingComplete();
        router.replace('/(tabs)/jobs');
      }}
    />
  );
}

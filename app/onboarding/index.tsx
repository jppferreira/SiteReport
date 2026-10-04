import { router } from 'expo-router';
import React from 'react';

import { Text } from '@/components';
import { BrandMark } from '@/features/onboarding/BrandMark';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { setOnboardingComplete } from '@/services/preferencesService';
import { useTheme } from '@/theme';

export default function OnboardingWelcome() {
  const { colors } = useTheme();

  return (
    <OnboardingScreen
      step={0}
      totalSteps={3}
      illustration={<BrandMark />}
      title="Professional proof of every job."
      description={
        <Text variant="body" color={colors.textSecondary}>
          Capture your work and create professional job reports in minutes.
        </Text>
      }
      ctaLabel="Get started"
      onCta={() => router.push('/onboarding/privacy')}
      onSkip={async () => {
        await setOnboardingComplete();
        router.replace('/(tabs)/jobs');
      }}
    />
  );
}

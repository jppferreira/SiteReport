import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { setOnboardingComplete } from '@/services/preferencesService';
import { useTheme } from '@/theme';

function Step({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: colors.surfaceSunken,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={26} color={colors.textPrimary} />
      </View>
      <Text variant="caption" color={colors.textSecondary}>
        {label}
      </Text>
    </View>
  );
}

export default function OnboardingCapture() {
  const { colors } = useTheme();

  return (
    <OnboardingScreen
      step={2}
      totalSteps={3}
      illustration={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Step icon="camera" label="Capture" />
          <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
          <Step icon="document-text" label="Document" />
          <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
          <Step icon="share" label="Share" />
        </View>
      }
      title="From job to report in minutes."
      description={
        <Text variant="body" color={colors.textSecondary}>
          Capture before and after photos, add your notes, and share a branded PDF report straight from the
          job site.
        </Text>
      }
      ctaLabel="Create my first job"
      onCta={async () => {
        await setOnboardingComplete();
        router.replace('/job/new');
      }}
      onSkip={async () => {
        await setOnboardingComplete();
        router.replace('/(tabs)/jobs');
      }}
    />
  );
}

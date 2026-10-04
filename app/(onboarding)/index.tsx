import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/components/core/Button';
import { AppText } from '@/components/core/AppText';
import { Card } from '@/components/core/Card';
import { useAppState } from '@/hooks/useAppState';
import { colors, spacing } from '@/theme';

const screens = [
  {
    title: 'Professional proof of every job.',
    body: 'Capture your work and create professional job reports in minutes.',
    cta: 'Get started',
  },
  {
    title: 'Your work stays yours.',
    body: 'Jobs are stored locally. Photos stay on your device. Customer details are not uploaded and no account is required.',
    cta: 'Continue',
  },
  {
    title: 'Capture → Document → Share',
    body: 'Turn job details, photos and notes into a polished report your customer can trust.',
    cta: 'Create my first job',
  },
] as const;

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const { finishOnboarding } = useAppState();
  const router = useRouter();
  const active = screens[step];

  const next = async () => {
    if (step < screens.length - 1) {
      setStep((prev) => prev + 1);
      return;
    }
    await finishOnboarding();
    router.replace('/(tabs)/jobs');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View style={styles.hero}>
          <AppText variant="caption" color={colors.textSecondary}>
            SITEREPORT
          </AppText>
          <AppText variant="h1">{active.title}</AppText>
          <AppText variant="body" color={colors.textSecondary}>
            {active.body}
          </AppText>
        </View>

        <Card style={styles.card}>
          <View style={styles.progress}>
            {screens.map((_, index) => (
              <View key={index} style={[styles.progressDot, index === step ? styles.progressDotActive : undefined]} />
            ))}
          </View>
          <Button label={active.cta} onPress={next} />
          <Button
            label="Skip"
            variant="tertiary"
            onPress={() => {
              void (async () => {
                await finishOnboarding();
                router.replace('/(tabs)/jobs');
              })();
            }}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  root: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.x2,
  },
  hero: {
    marginTop: spacing.x4,
    gap: spacing.lg,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  progress: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  progressDot: {
    width: 22,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.accent,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Screen, Text, TextButton } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { setOnboardingComplete } from '@/services/preferencesService';
import { useTheme } from '@/theme';

import { Wordmark } from './Wordmark';

type WelcomeScreenProps = {
  onGetStarted: () => void;
};

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();

  const features = useMemo(
    () =>
      [
        {
          icon: 'phone-portrait-outline' as const,
          title: t('onboarding.welcomeFeature1Title'),
          body: t('onboarding.welcomeFeature1Body'),
        },
        {
          icon: 'document-text-outline' as const,
          title: t('onboarding.welcomeFeature2Title'),
          body: t('onboarding.welcomeFeature2Body'),
        },
        {
          icon: 'share-outline' as const,
          title: t('onboarding.welcomeFeature3Title'),
          body: t('onboarding.welcomeFeature3Body'),
        },
      ] satisfies { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[],
    [t]
  );

  const skip = async () => {
    await setOnboardingComplete();
    router.replace('/(tabs)/jobs');
  };

  return (
    <Screen padded>
      <View style={styles.skipRow}>
        <TextButton label={t('onboarding.welcomeSkip')} onPress={skip} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Wordmark size="hero" />
          <Text variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
            {t('onboarding.welcomeTagline')}
          </Text>
        </View>

        <View style={{ marginTop: spacing.xxl, gap: spacing.lg }}>
          {features.map((feature) => (
            <View key={feature.title} style={styles.feature}>
              <View style={[styles.icon, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]}>
                <Ionicons name={feature.icon} size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">{feature.title}</Text>
                <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  {feature.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.cta}>
        <Button label={t('onboarding.welcomeGetStarted')} onPress={onGetStarted} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  skipRow: {
    alignItems: 'flex-end',
  },
  scroll: {
    paddingBottom: 16,
  },
  hero: {
    alignItems: 'center',
    marginTop: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  icon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    paddingBottom: 16,
    paddingTop: 8,
  },
});

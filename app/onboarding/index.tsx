import { router } from 'expo-router';
import React, { useMemo } from 'react';

import { HeroOnboardingScreen, type HeroOnboardingStep } from '@/features/onboarding/HeroOnboardingScreen';
import { useI18n } from '@/i18n/useI18n';

export default function OnboardingWelcome() {
  const { t } = useI18n();

  const steps: HeroOnboardingStep[] = useMemo(
    () => [
      {
        image: require('../../assets/images/onboarding-welcome-hero.png'),
        imageLabel: t('onboarding.welcomeImageLabel'),
        title: t('onboarding.welcomeTitle'),
        subtitle: t('onboarding.welcomeSubtitle'),
        body: t('onboarding.welcomeBody'),
      },
      {
        image: require('../../assets/images/onboarding-capture-hero.jpg'),
        imageLabel: t('onboarding.captureImageLabel'),
        title: t('onboarding.captureTitle'),
        subtitle: t('onboarding.captureSubtitle'),
        body: t('onboarding.captureBody'),
      },
      {
        image: require('../../assets/images/onboarding-document-hero.jpg'),
        imageLabel: t('onboarding.documentImageLabel'),
        title: t('onboarding.documentTitle'),
        subtitle: t('onboarding.documentSubtitle'),
        body: t('onboarding.documentBody'),
      },
      {
        image: require('../../assets/images/onboarding-share-hero.jpg'),
        imageLabel: t('onboarding.shareImageLabel'),
        title: t('onboarding.shareTitle'),
        subtitle: t('onboarding.shareSubtitle'),
        body: t('onboarding.shareBody'),
      },
      {
        image: require('../../assets/images/onboarding-privacy-hero.jpg'),
        imageLabel: t('onboarding.privacyImageLabel'),
        title: t('onboarding.privacyTitle'),
        subtitle: t('onboarding.privacySubtitle'),
        body: t('onboarding.privacyBody'),
      },
    ],
    [t]
  );

  return <HeroOnboardingScreen steps={steps} onComplete={() => router.push('/onboarding/profile')} />;
}

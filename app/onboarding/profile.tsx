import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FIELD_STACK_GAP, Input, LocalImage, PermissionNotice, Text } from '@/components';
import { OnboardingHeading, OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useI18n } from '@/i18n/useI18n';
import { ensureBusinessDirectory } from '@/services/fileService';
import { processBusinessLogo } from '@/services/imageService';
import { requestPhotoLibraryAccess } from '@/services/photoLibraryAccess';
import { setOnboardingComplete } from '@/services/preferencesService';
import { useTheme } from '@/theme';

export default function OnboardingProfile() {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const { save } = useBusinessProfile();
  const { isPro } = useEntitlement();

  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const persistDetails = async () => {
    const patch: { businessName?: string; ownerName?: string } = {};
    const name = businessName.trim();
    const owner = ownerName.trim();
    if (name) patch.businessName = name;
    if (owner) patch.ownerName = owner;
    if (Object.keys(patch).length > 0) {
      await save(patch);
    }
  };

  const finish = async (destination: '/job/new' | '/(tabs)/jobs', saveDetails: boolean) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (saveDetails) await persistDetails();
      await setOnboardingComplete();
      router.replace(destination);
    } catch {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handlePickLogo = async () => {
    if (!isPro) {
      router.push({ pathname: '/paywall', params: { trigger: 'logo' } });
      return;
    }
    const allowed = await requestPhotoLibraryAccess();
    if (!allowed) {
      setPermissionDenied(true);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || result.assets.length === 0) return;

    try {
      const dir = await ensureBusinessDirectory();
      const destination = `${dir}logo.png`;
      const saved = await processBusinessLogo(result.assets[0]!.uri, destination);
      setLogoUri(saved);
      await save({ logoUri: saved });
    } catch {
      setLogoUri(null);
    }
  };

  const logoLabel = isPro
    ? logoUri
      ? t('onboarding.profileChangeLogo')
      : t('onboarding.profileAddLogo')
    : t('onboarding.profileUpgradeLogo');

  return (
    <OnboardingScreen
      step={6}
      totalSteps={6}
      showBadge={false}
      progressVariant="dots"
      keyboardAvoiding
      ctaLabel={t('onboarding.profileCta')}
      ctaLoading={busy}
      onCta={() => finish('/job/new', true)}
      secondaryLabel={t('onboarding.profileSkip')}
      onSecondary={() => finish('/(tabs)/jobs', false)}
    >
      <OnboardingHeading title={t('onboarding.profileTitle')} subtitle={t('onboarding.profileSubtitle')} />

      <View style={{ marginTop: spacing.xl, gap: spacing.lg }}>
        <View style={{ gap: FIELD_STACK_GAP }}>
          <Input
            label={t('onboarding.profileBusinessName')}
            value={businessName}
            onChangeText={setBusinessName}
            autoCapitalize="words"
          />
          <Input
            label={t('onboarding.profileYourName')}
            value={ownerName}
            onChangeText={setOwnerName}
            autoCapitalize="words"
          />
        </View>

        <Pressable
          onPress={handlePickLogo}
          accessibilityRole="button"
          accessibilityLabel={logoLabel}
          style={[
            styles.logoRow,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              paddingHorizontal: spacing.md,
            },
          ]}
        >
          <View style={[styles.logoMark, { backgroundColor: colors.accentSoft, borderRadius: 10 }]}>
            {logoUri ? <LocalImage uri={logoUri} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          </View>
          <Text variant="body" style={styles.logoLabel}>
            {logoLabel}
          </Text>
        </Pressable>
      </View>

      <PermissionNotice visible={permissionDenied} kind="library" onDismiss={() => setPermissionDenied(false)} />
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  logoRow: {
    minHeight: 64,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  logoMark: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoLabel: {
    flex: 1,
  },
});

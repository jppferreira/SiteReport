import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FIELD_STACK_GAP, Input, LocalImage, NavigationHeader, PermissionNotice, Screen, StatusBadge, Text, TextButton } from '@/components';
import { businessProfileRepository } from '@/database';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useFlushWhenHidden } from '@/hooks/useFlushWhenHidden';
import { ensureBusinessDirectory } from '@/services/fileService';
import { processBusinessLogo } from '@/services/imageService';
import { requestPhotoLibraryAccess } from '@/services/photoLibraryAccess';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { validateEmail } from '@/utils/validation';

export default function BusinessProfileScreen() {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const { profile, loading, save } = useBusinessProfile();
  const { isPro } = useEntitlement();

  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [savedState, setSavedState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);
  const draftRef = useRef({ businessName, ownerName, email, phone, website, address, registrationNumber, vatNumber });

  useEffect(() => {
    draftRef.current = { businessName, ownerName, email, phone, website, address, registrationNumber, vatNumber };
  }, [businessName, ownerName, email, phone, website, address, registrationNumber, vatNumber]);

  const persistPending = useCallback(() => {
    if (!pendingRef.current || !hydrated.current) return;
    const draft = draftRef.current;
    if (!validateEmail(draft.email).valid) return;
    pendingRef.current = false;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    void businessProfileRepository.saveBusinessProfile(draft).catch(() => undefined);
  }, []);

  useFlushWhenHidden(persistPending);

  useEffect(() => {
    if (profile && !hydrated.current) {
      setBusinessName(profile.businessName ?? '');
      setOwnerName(profile.ownerName ?? '');
      setEmail(profile.email ?? '');
      setPhone(profile.phone ?? '');
      setWebsite(profile.website ?? '');
      setAddress(profile.address ?? '');
      setRegistrationNumber(profile.registrationNumber ?? '');
      setVatNumber(profile.vatNumber ?? '');
      setLogoUri(profile.logoUri ?? null);
      hydrated.current = true;
    }
  }, [profile]);

  useEffect(() => {
    if (!hydrated.current) return;
    const validation = validateEmail(email);
    setEmailError(validation.valid ? null : validation.message);
    if (!validation.valid) return;

    // Immediately reflects "saving" while the debounced persistence below
    // runs; this mirrors the autosave operation itself, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedState('saving');
    pendingRef.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      pendingRef.current = false;
      timer.current = null;
      await save({ businessName, ownerName, email, phone, website, address, registrationNumber, vatNumber });
      setSavedState('saved');
    }, 500);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [businessName, ownerName, email, phone, website, address, registrationNumber, vatNumber, save]);

  const openPaywall = () => {
    router.push({ pathname: '/paywall', params: { trigger: 'logo' } });
  };

  const handlePickLogo = async () => {
    if (!isPro) {
      openPaywall();
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

    const dir = await ensureBusinessDirectory();
    const destination = `${dir}logo.png`;
    const saved = await processBusinessLogo(result.assets[0]!.uri, destination);
    setLogoUri(saved);
    await save({ logoUri: saved });
  };

  if (loading) return null;

  return (
    <Screen>
      <NavigationHeader
        title={t('businessProfile.title')}
        onBack={() => router.back()}
        right={<TextButton label={t('businessProfile.done')} onPress={() => router.back()} />}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: FIELD_STACK_GAP }}
          keyboardShouldPersistTaps="handled"
        >
          <Input label={t('businessProfile.businessName')} value={businessName} onChangeText={setBusinessName} placeholder={t('businessProfile.businessNamePlaceholder')} />

          <Pressable
            onPress={handlePickLogo}
            accessibilityRole="button"
            accessibilityLabel={isPro ? t('businessProfile.chooseLogoA11y') : t('businessProfile.logoProA11y')}
            style={styles.logoRow}
          >
            <View style={[styles.logo, { backgroundColor: colors.surfaceSunken, borderRadius: radius.lg }]}>
              {logoUri ? (
                <LocalImage uri={logoUri} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
              )}
            </View>
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <View style={styles.logoLabelRow}>
                <Text variant="label" color={colors.textSecondary}>
                  {t('businessProfile.logo')}
                </Text>
                {!isPro ? <StatusBadge label={t('businessProfile.proBadge')} tone="accent" /> : null}
              </View>
              <Text variant="bodyMedium" color={colors.accent} style={{ marginTop: 2 }}>
                {isPro
                  ? logoUri
                    ? t('businessProfile.changeLogo')
                    : t('businessProfile.addLogo')
                  : t('businessProfile.upgradeForLogo')}
              </Text>
            </View>
          </Pressable>

          <Input label={t('businessProfile.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={t('businessProfile.phonePlaceholder')} />
          <Input label={t('businessProfile.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={emailError ?? undefined} placeholder={t('businessProfile.emailPlaceholder')} />
          <Input label={t('businessProfile.yourName')} value={ownerName} onChangeText={setOwnerName} />
          <Input label={t('businessProfile.website')} value={website} onChangeText={setWebsite} autoCapitalize="none" />
          <Input label={t('businessProfile.businessAddress')} value={address} onChangeText={setAddress} />
          <Input label={t('businessProfile.registrationNumber')} value={registrationNumber} onChangeText={setRegistrationNumber} />
          <Input label={t('businessProfile.vatNumber')} value={vatNumber} onChangeText={setVatNumber} />

          <Text variant="caption" color={colors.textSecondary}>
            {savedState === 'saving'
              ? t('businessProfile.saving')
              : savedState === 'saved'
                ? t('businessProfile.allChangesSaved')
                : ' '}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <PermissionNotice visible={permissionDenied} kind="library" onDismiss={() => setPermissionDenied(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

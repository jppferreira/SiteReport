import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Input, NavigationHeader, PermissionNotice, Screen, Text, TextButton } from '@/components';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { ensureBusinessDirectory } from '@/services/fileService';
import { processBusinessLogo } from '@/services/imageService';
import { useTheme } from '@/theme';
import { validateEmail } from '@/utils/validation';

export default function BusinessProfileScreen() {
  const { colors, radius, spacing } = useTheme();
  const { profile, loading, save } = useBusinessProfile();

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
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await save({ businessName, ownerName, email, phone, website, address, registrationNumber, vatNumber });
      setSavedState('saved');
    }, 500);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [businessName, ownerName, email, phone, website, address, registrationNumber, vatNumber, save]);

  const handlePickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
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
        title="Business profile"
        onBack={() => router.back()}
        right={<TextButton label="Done" onPress={() => router.back()} />}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={handlePickLogo} accessibilityRole="button" accessibilityLabel="Choose business logo" style={styles.logoRow}>
            <View style={[styles.logo, { backgroundColor: colors.surfaceSunken, borderRadius: radius.lg }]}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Ionicons name="business-outline" size={24} color={colors.textSecondary} />
              )}
            </View>
            <Text variant="bodyMedium" color={colors.accentPressed} style={{ marginLeft: spacing.sm }}>
              {logoUri ? 'Change logo' : 'Add logo'}
            </Text>
          </Pressable>

          <Input label="Business name" value={businessName} onChangeText={setBusinessName} placeholder="e.g. Smith Plumbing" />
          <Input label="Your name" value={ownerName} onChangeText={setOwnerName} />
          <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={emailError ?? undefined} />
          <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Input label="Website" value={website} onChangeText={setWebsite} autoCapitalize="none" />
          <Input label="Business address" value={address} onChangeText={setAddress} />
          <Input label="Registration number" value={registrationNumber} onChangeText={setRegistrationNumber} />
          <Input label="VAT number" value={vatNumber} onChangeText={setVatNumber} />

          <Text variant="caption" color={colors.textSecondary}>
            {savedState === 'saving' ? 'Saving…' : savedState === 'saved' ? 'All changes saved' : ' '}
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
  logo: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

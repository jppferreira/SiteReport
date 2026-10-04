import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/core/AppText';
import { Button } from '@/components/core/Button';
import { Card } from '@/components/core/Card';
import { Input } from '@/components/core/Input';
import { useAppState } from '@/hooks/useAppState';
import type { BusinessProfile } from '@/models/domain';
import { databaseService } from '@/services/databaseService';
import { colors, radius, spacing } from '@/theme';

const accentChoices = ['#34D058', '#101310', '#0A84FF', '#D64045', '#9A6BFF'];

const emptyProfile: BusinessProfile = {
  businessName: '',
  logoUri: null,
  name: null,
  email: null,
  phone: null,
  website: null,
  address: null,
  registrationNumber: null,
  vatNumber: null,
  accentColour: '#34D058',
  footerMessage: null,
};

export default function BusinessProfileScreen() {
  const { entitlement } = useAppState();
  const router = useRouter();
  const [profile, setProfile] = useState<BusinessProfile>(emptyProfile);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const next = await databaseService.getBusinessProfile();
    setProfile(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const save = async () => {
    setSaving(true);
    await databaseService.upsertBusinessProfile(profile);
    setSaving(false);
  };

  const pickLogoFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
    if (!result.canceled && result.assets[0]) {
      setProfile((prev) => ({ ...prev, logoUri: result.assets[0].uri }));
    }
  };

  const pickLogoFromFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/*'] });
    if (!result.canceled && result.assets[0]) {
      setProfile((prev) => ({ ...prev, logoUri: result.assets[0].uri }));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="h2">Business profile</AppText>

        <Card style={styles.card}>
          <Input
            label="Business name"
            placeholder="Required for branding"
            value={profile.businessName}
            onChangeText={(businessName) => setProfile((prev) => ({ ...prev, businessName }))}
          />
          <Input label="Your name" value={profile.name ?? ''} onChangeText={(name) => setProfile((prev) => ({ ...prev, name }))} />
          <Input label="Email" value={profile.email ?? ''} onChangeText={(email) => setProfile((prev) => ({ ...prev, email }))} />
          <Input label="Phone" value={profile.phone ?? ''} onChangeText={(phone) => setProfile((prev) => ({ ...prev, phone }))} />
          <Input label="Website" value={profile.website ?? ''} onChangeText={(website) => setProfile((prev) => ({ ...prev, website }))} />
          <Input label="Business address" value={profile.address ?? ''} onChangeText={(address) => setProfile((prev) => ({ ...prev, address }))} />
          <Input
            label="Registration number"
            value={profile.registrationNumber ?? ''}
            onChangeText={(registrationNumber) => setProfile((prev) => ({ ...prev, registrationNumber }))}
          />
          <Input label="VAT number" value={profile.vatNumber ?? ''} onChangeText={(vatNumber) => setProfile((prev) => ({ ...prev, vatNumber }))} />
          <Input
            label="Footer message"
            value={profile.footerMessage ?? ''}
            onChangeText={(footerMessage) => setProfile((prev) => ({ ...prev, footerMessage }))}
          />
        </Card>

        <Card style={styles.card}>
          <AppText variant="h3">Report branding</AppText>
          <View style={styles.logoRow}>
            {profile.logoUri ? <Image source={{ uri: profile.logoUri }} style={styles.logo} /> : <View style={styles.logoPlaceholder} />}
            <View style={styles.logoActions}>
              <Button label="Choose logo" variant="secondary" onPress={() => void pickLogoFromLibrary()} />
              <Button label="From files" variant="tertiary" onPress={() => void pickLogoFromFiles()} />
            </View>
          </View>

          <AppText variant="body">Accent colour</AppText>
          <View style={styles.palette}>
            {accentChoices.map((colorOption) => {
              const disabled = !entitlement.hasProAccess && colorOption !== '#34D058';
              return (
                <Button
                  key={colorOption}
                  label=""
                  disabled={disabled}
                  onPress={() => setProfile((prev) => ({ ...prev, accentColour: colorOption }))}
                  style={[
                    styles.swatch,
                    { backgroundColor: colorOption, borderColor: profile.accentColour === colorOption ? colors.cta : colors.border },
                  ]}
                />
              );
            })}
          </View>
          {!entitlement.hasProAccess ? (
            <AppText variant="caption" color={colors.textSecondary}>
              Additional accent colours are available with Pro.
            </AppText>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <AppText variant="h3">Branding preview</AppText>
          <View style={[styles.preview, { borderColor: profile.accentColour }]}>
            <AppText variant="body">{profile.businessName || 'Business Name'}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Thank you for choosing {profile.businessName || 'your business'}.
            </AppText>
          </View>
        </Card>

        <Button label="Save profile" onPress={() => void save()} loading={saving} />
        {!entitlement.hasProAccess ? (
          <Button label="Upgrade for full branding" variant="secondary" onPress={() => router.push('/paywall')} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.x5,
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  logoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    resizeMode: 'contain',
  },
  logoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  logoActions: {
    flex: 1,
    gap: spacing.xs,
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  swatch: {
    width: 42,
    minHeight: 42,
    paddingHorizontal: 0,
    borderWidth: 2,
  },
  preview: {
    borderWidth: 1,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
  },
});

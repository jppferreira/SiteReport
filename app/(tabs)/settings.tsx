import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import React from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { SettingRow, Text } from '@/components';
import { SettingsGroup } from '@/features/settings/SettingsGroup';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useTheme } from '@/theme';

export default function SettingsScreen() {
  const { colors, spacing } = useTheme();
  const { profile } = useBusinessProfile();
  const { isPro } = useEntitlement();

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build = Platform.select({
    ios: Application.nativeBuildVersion,
    android: Application.nativeBuildVersion,
    default: '1',
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Text variant="display">Settings</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.md }}>
        <SettingsGroup title="Business">
          <SettingRow
            label="Business profile"
            value={profile?.businessName || undefined}
            icon="business-outline"
            onPress={() => router.push('/settings/business-profile')}
          />
          <SettingRow label="Report branding" icon="color-palette-outline" onPress={() => router.push('/settings/branding')} />
        </SettingsGroup>

        <SettingsGroup title="Preferences">
          <SettingRow label="Photo & report settings" icon="options-outline" onPress={() => router.push('/settings/preferences')} />
        </SettingsGroup>

        <SettingsGroup title="Data & privacy">
          <SettingRow label="Storage usage" icon="server-outline" onPress={() => router.push('/settings/data')} />
          <SettingRow label="Privacy policy" icon="shield-checkmark-outline" onPress={() => router.push('/settings/privacy')} />
        </SettingsGroup>

        <SettingsGroup title="Support">
          <SettingRow label="Help" icon="help-circle-outline" onPress={() => router.push('/settings/help')} />
          <SettingRow label="Terms of use" icon="document-text-outline" onPress={() => router.push('/settings/terms')} />
        </SettingsGroup>

        <SettingsGroup title="Account">
          <SettingRow
            label={isPro ? 'Manage subscription' : 'Upgrade to Pro'}
            value={isPro ? 'Pro' : 'Free'}
            icon="star-outline"
            onPress={() => router.push('/paywall')}
          />
        </SettingsGroup>

        <SettingsGroup title="About">
          <SettingRow label="Version" value={version} icon="information-circle-outline" showChevron={false} />
          <SettingRow label="Build" value={String(build ?? '1')} icon="construct-outline" showChevron={false} />
        </SettingsGroup>
      </ScrollView>
    </View>
  );
}

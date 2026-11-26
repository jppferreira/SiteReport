import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CrewAvatar, NavigationHeader, Screen, SettingRow, StatusBadge, Text, ToggleRow } from '@/components';
import { ContactSheet } from '@/features/settings/ContactSheet';
import { SettingsGroup } from '@/features/settings/SettingsGroup';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useCrewAvatar } from '@/hooks/useCrewAvatar';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useIcloudAutoBackupSetting } from '@/hooks/useIcloudAutoBackupSetting';
import { LOCALE_LABELS } from '@/i18n';
import { useI18n } from '@/i18n/useI18n';
import type { Entitlement } from '@/models';
import { coverDesignLabel } from '@/models';
import { reportTemplateLabel } from '@/services/pdfService';
import {
  getDevEntitlementOverride,
  setDevEntitlementOverride,
  type DevEntitlementOverride,
} from '@/services/entitlementService';
import { productIdForPlan } from '@/services/purchases/catalog';
import { openPlatformSubscriptionManagement } from '@/services/purchases/subscriptionManagement';
import { getPreferences, resetOnboarding } from '@/services/preferencesService';
import { useTheme } from '@/theme';
import { formatDate } from '@/utils/format';
import { goBack } from '@/utils/goBack';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/utils/siteUrls';

export default function SettingsScreen() {
  const { colors, spacing, radius, appearance } = useTheme();
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const { profile } = useBusinessProfile();
  const [crewComposition] = useCrewAvatar();
  const { entitlement, isPro, refresh: refreshEntitlementState } = useEntitlement();
  const [layoutLabel, setLayoutLabel] = useState<string>();
  const [contactOpen, setContactOpen] = useState(false);
  const [icloudAutoBackup, setIcloudAutoBackup] = useIcloudAutoBackupSetting();
  const [devOverride, setDevOverride] = useState<DevEntitlementOverride | null>(null);

  const appearanceLabel = appearanceLabelFor(t, appearance);

  const businessName = profile?.businessName?.trim() || t('settings.noBusinessName');
  const planLabel = planLabelFor(entitlement, t);
  const planStatus = planStatusFor(entitlement, t);
  const planBadgeTone = isPro ? 'accent' : 'neutral';

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getPreferences().then((preferences) => {
        if (active) {
          setLayoutLabel(
            `${reportTemplateLabel(preferences.reportTemplate)} · ${coverDesignLabel(preferences.coverDesign)}`
          );
        }
      });
      if (__DEV__) {
        getDevEntitlementOverride().then((value) => {
          if (active) setDevOverride(value);
        });
      }
      return () => {
        active = false;
      };
    }, [])
  );

  const applyDevPlan = useCallback(
    async (override: DevEntitlementOverride | null) => {
      await setDevEntitlementOverride(override);
      setDevOverride(override);
      await refreshEntitlementState();
    },
    [refreshEntitlementState]
  );

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build =
    Constants.nativeBuildVersion ??
    Platform.select({
      ios: Constants.expoConfig?.ios?.buildNumber,
      android: Constants.expoConfig?.android?.versionCode?.toString(),
      default: '1',
    }) ??
    '1';

  const openSubscription = useCallback(async () => {
    const planId = entitlement.planId;
    if (isPro && planId && planId !== 'lifetime') {
      const opened = await openPlatformSubscriptionManagement(productIdForPlan(planId)).catch(() => false);
      if (opened) return;
    }
    router.push('/paywall');
  }, [entitlement.planId, isPro]);

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <NavigationHeader title={t('settings.title')} onBack={() => goBack('/(tabs)/jobs')} />
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.lg + Math.max(insets.bottom, spacing.sm),
        }}
      >
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.xl,
              padding: spacing.md,
              marginBottom: spacing.xl,
            },
          ]}
        >
          <Pressable
            onPress={() => router.push('/settings/avatar')}
            accessibilityRole="button"
            accessibilityLabel={t('settings.changeAvatarA11y')}
            hitSlop={8}
          >
            <CrewAvatar composition={crewComposition} size={56} borderColor={colors.border} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings/business-profile')}
            accessibilityRole="button"
            accessibilityLabel={t('settings.businessProfile')}
            style={({ pressed }) => [styles.profileText, { opacity: pressed ? 0.92 : 1 }]}
          >
            <Text variant="h3" numberOfLines={1}>
              {businessName}
            </Text>
            <View style={{ marginTop: spacing.xs }}>
              <StatusBadge label={isPro ? t('settings.planPro') : t('settings.planFree')} tone={planBadgeTone} />
            </View>
          </Pressable>
        </View>

        <SettingsGroup title={t('settings.groupAccount')}>
          <SettingRow label={t('settings.yourPlan')} value={planLabel} icon="star-outline" showChevron={false} />
          {planStatus ? (
            <SettingRow
              label={planStatus}
              icon={entitlement.subscriptionState === 'cancelled' ? 'time-outline' : 'calendar-outline'}
              showChevron={false}
            />
          ) : null}
          <SettingRow
            label={isPro && entitlement.planId !== 'lifetime' ? t('settings.manageSubscription') : t('settings.upgradeToPro')}
            icon={isPro && entitlement.planId !== 'lifetime' ? 'card-outline' : 'arrow-up-circle-outline'}
            onPress={() => void openSubscription()}
          />
        </SettingsGroup>

        <SettingsGroup title={t('settings.groupBusiness')}>
          <SettingRow
            label={t('settings.businessProfile')}
            value={profile?.businessName || undefined}
            icon="business-outline"
            onPress={() => router.push('/settings/business-profile')}
          />
          <SettingRow
            label={t('settings.quotesInvoices')}
            value={isPro ? undefined : t('common.proBadge')}
            icon="receipt-outline"
            onPress={() => router.push('/settings/quotes-invoices')}
          />
          <SettingRow
            label={t('settings.brandingAndLayout')}
            value={layoutLabel}
            icon="color-palette-outline"
            onPress={() => router.push('/settings/branding')}
          />
        </SettingsGroup>

        <SettingsGroup title={t('settings.groupPreferences')}>
          <SettingRow
            label={t('settings.changeAvatar')}
            icon="happy-outline"
            onPress={() => router.push('/settings/avatar')}
          />
          <SettingRow
            label={t('settings.appearance')}
            value={appearanceLabel}
            icon="moon-outline"
            onPress={() => router.push('/settings/appearance')}
          />
          <SettingRow
            label={t('settings.language')}
            value={LOCALE_LABELS[locale]}
            icon="language-outline"
            onPress={() => router.push('/settings/language')}
          />
          <SettingRow
            label={t('settings.photoReportSettings')}
            icon="options-outline"
            onPress={() => router.push('/settings/preferences')}
          />
        </SettingsGroup>

        <SettingsGroup title={t('settings.groupDataPrivacy')}>
          {Platform.OS === 'ios' ? (
            <ToggleRow
              label={t('settings.icloudAutoBackup')}
              description={t('settings.icloudAutoBackupDescription')}
              value={icloudAutoBackup}
              onValueChange={setIcloudAutoBackup}
            />
          ) : null}
          <SettingRow label={t('settings.storageUsage')} icon="server-outline" onPress={() => router.push('/settings/data')} />
          <SettingRow
            label={t('settings.privacyPolicy')}
            icon="shield-checkmark-outline"
            onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
          />
        </SettingsGroup>

        <SettingsGroup title={t('settings.groupSupport')}>
          <SettingRow label={t('settings.help')} icon="help-circle-outline" onPress={() => router.push('/settings/help')} />
          <SettingRow
            label={t('settings.contactUs')}
            icon="chatbubble-ellipses-outline"
            onPress={() => setContactOpen(true)}
          />
          <SettingRow
            label={t('settings.termsOfUse')}
            icon="document-text-outline"
            onPress={() => void Linking.openURL(TERMS_OF_USE_URL)}
          />
        </SettingsGroup>

        <SettingsGroup title={t('settings.groupAbout')}>
          <SettingRow label={t('settings.version')} value={version} icon="information-circle-outline" showChevron={false} />
          <SettingRow label={t('settings.build')} value={String(build ?? '1')} icon="construct-outline" showChevron={false} />
          {__DEV__ ? (
            <SettingRow
              label="Test onboarding"
              icon="play-outline"
              onPress={async () => {
                await resetOnboarding();
                router.push('/onboarding');
              }}
            />
          ) : null}
        </SettingsGroup>

        {__DEV__ ? (
          <SettingsGroup title={`Test plans${devOverride ? ` · ${devOverride}` : ''}`}>
            <SettingRow
              label="Free"
              icon="remove-circle-outline"
              onPress={() => void applyDevPlan('free')}
              showChevron={false}
            />
            <SettingRow
              label="Pro Monthly"
              icon="calendar-outline"
              onPress={() => void applyDevPlan('monthly')}
              showChevron={false}
            />
            <SettingRow
              label="Pro Yearly"
              icon="calendar-outline"
              onPress={() => void applyDevPlan('annual')}
              showChevron={false}
            />
            <SettingRow
              label="Pro Lifetime"
              icon="infinite-outline"
              onPress={() => void applyDevPlan('lifetime')}
              showChevron={false}
            />
            <SettingRow
              label="Clear override (use store)"
              icon="refresh-outline"
              onPress={() => void applyDevPlan(null)}
              showChevron={false}
            />
          </SettingsGroup>
        ) : null}
      </ScrollView>
      <ContactSheet visible={contactOpen} onClose={() => setContactOpen(false)} />
    </Screen>
  );
}

function appearanceLabelFor(
  t: ReturnType<typeof useI18n>['t'],
  appearance: 'system' | 'light' | 'dark'
): string {
  if (appearance === 'system') return t('appearance.system');
  if (appearance === 'light') return t('appearance.light');
  return t('appearance.dark');
}

function planLabelFor(entitlement: Entitlement, t: ReturnType<typeof useI18n>['t']): string {
  if (entitlement.status !== 'pro') return t('settings.planFree');
  if (entitlement.isLifetime || entitlement.planId === 'lifetime') return t('settings.planProLifetime');
  if (entitlement.planId === 'annual') return t('settings.planProYearly');
  if (entitlement.planId === 'monthly') return t('settings.planProMonthly');
  return t('settings.planPro');
}

function planStatusFor(entitlement: Entitlement, t: ReturnType<typeof useI18n>['t']): string | undefined {
  if (entitlement.status !== 'pro') return undefined;
  if (entitlement.isLifetime || entitlement.planId === 'lifetime') return t('settings.subscriptionLifetime');
  if (entitlement.subscriptionState === 'grace_period') return t('settings.subscriptionGrace');

  const date = entitlement.expiresAt ? formatDate(entitlement.expiresAt) : '';
  if (entitlement.subscriptionState === 'cancelled') {
    return date ? t('settings.subscriptionEnds', { date }) : t('settings.subscriptionCancelled');
  }
  if (date) return t('settings.subscriptionRenews', { date });
  return undefined;
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  profileText: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },
});

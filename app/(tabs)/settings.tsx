import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import React, { useCallback, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { Screen, SettingRow, Text, ToggleRow } from '@/components';
import { SettingsGroup } from '@/features/settings/SettingsGroup';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useIcloudAutoBackupSetting } from '@/hooks/useIcloudAutoBackupSetting';
import { LOCALE_LABELS } from '@/i18n';
import { useI18n } from '@/i18n/useI18n';
import { coverDesignLabel } from '@/models';
import { reportTemplateLabel } from '@/services/pdfService';
import { productIdForPlan } from '@/services/purchases/catalog';
import { openPlatformSubscriptionManagement } from '@/services/purchases/subscriptionManagement';
import { getPreferences, resetOnboarding } from '@/services/preferencesService';
import { useTheme } from '@/theme';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/utils/siteUrls';

export default function SettingsScreen() {
  const { spacing } = useTheme();
  const { t, locale } = useI18n();
  const tabBarHeight = useBottomTabBarHeight();
  const { profile } = useBusinessProfile();
  const { entitlement, isPro } = useEntitlement();
  const [layoutLabel, setLayoutLabel] = useState<string>();
  const [icloudAutoBackup, setIcloudAutoBackup] = useIcloudAutoBackupSetting();

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
      return () => {
        active = false;
      };
    }, [])
  );

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build = Platform.select({
    ios: Application.nativeBuildVersion,
    android: Application.nativeBuildVersion,
    default: '1',
  });

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <Text variant="display">{t('settings.title')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg + tabBarHeight }}>
        <SettingsGroup title={t('settings.groupBusiness')}>
          <SettingRow
            label={t('settings.businessProfile')}
            value={profile?.businessName || undefined}
            icon="business-outline"
            onPress={() => router.push('/settings/business-profile')}
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
            label={t('settings.language')}
            value={LOCALE_LABELS[locale]}
            icon="language-outline"
            onPress={() => router.push('/settings/language')}
          />
          <SettingRow label={t('settings.photoReportSettings')} icon="options-outline" onPress={() => router.push('/settings/preferences')} />
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
          <SettingRow label={t('settings.reportABug')} icon="bug-outline" onPress={() => router.push('/settings/bug-report')} />
          <SettingRow
            label={t('settings.termsOfUse')}
            icon="document-text-outline"
            onPress={() => void Linking.openURL(TERMS_OF_USE_URL)}
          />
        </SettingsGroup>

        <SettingsGroup title={t('settings.groupAccount')}>
          <SettingRow
            label={isPro ? t('settings.manageSubscription') : t('settings.upgradeToPro')}
            value={isPro ? t('settings.planPro') : t('settings.planFree')}
            icon="star-outline"
            onPress={async () => {
              const planId = entitlement.planId;
              if (isPro && planId && planId !== 'lifetime') {
                const opened = await openPlatformSubscriptionManagement(productIdForPlan(planId)).catch(() => false);
                if (opened) return;
              }
              router.push('/paywall');
            }}
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
      </ScrollView>
    </Screen>
  );
}

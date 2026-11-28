import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, CrewAvatar, Screen, SplitView, SplitViewEmptyState, StatusBadge, Text } from '@/components';
import { AppearanceDetailPane } from '@/features/settings/AppearanceDetailPane';
import { BrandingDetailPane } from '@/features/settings/BrandingDetailPane';
import { BusinessProfileDetailPane } from '@/features/settings/BusinessProfileDetailPane';
import { GenericDetailPane } from '@/features/settings/GenericDetailPane';
import { LanguageDetailPane } from '@/features/settings/LanguageDetailPane';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useCrewAvatar } from '@/hooks/useCrewAvatar';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useTabletBreakpoint } from '@/hooks/useTabletBreakpoint';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { getLayoutTokens } from '@/theme/layoutTokens';

type SettingsSection =
  | 'account'
  | 'business-profile'
  | 'quotes-invoices'
  | 'branding'
  | 'avatar'
  | 'appearance'
  | 'language'
  | 'preferences'
  | 'data'
  | 'privacy'
  | 'help'
  | 'about';

/**
 * iPad-specific Settings screen with split view: list of sections on the left,
 * selected section detail on the right.
 */
export function SettingsScreenTablet() {
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();
  const { profile } = useBusinessProfile();
  const [crewComposition] = useCrewAvatar();
  const { isPro } = useEntitlement();

  const [selectedSection, setSelectedSection] = useState<SettingsSection | null>(null);

  const businessName = profile?.businessName?.trim() || t('settings.noBusinessName');
  const planBadgeTone = isPro ? 'accent' : 'neutral';

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build =
    Constants.nativeBuildVersion ??
    Platform.select({
      ios: Constants.expoConfig?.ios?.buildNumber,
      android: Constants.expoConfig?.android?.versionCode?.toString(),
      default: '1',
    }) ??
    '1';

  const sections: { id: SettingsSection; label: string; icon: string; route: string }[] = [
    { id: 'business-profile', label: t('settings.businessProfile'), icon: 'business-outline', route: '/settings/business-profile' },
    { id: 'quotes-invoices', label: t('settings.quotesInvoices'), icon: 'receipt-outline', route: '/settings/quotes-invoices' },
    { id: 'branding', label: t('settings.brandingAndLayout'), icon: 'color-palette-outline', route: '/settings/branding' },
    { id: 'avatar', label: t('settings.changeAvatar'), icon: 'happy-outline', route: '/settings/avatar' },
    { id: 'appearance', label: t('settings.appearance'), icon: 'moon-outline', route: '/settings/appearance' },
    { id: 'language', label: t('settings.language'), icon: 'language-outline', route: '/settings/language' },
    { id: 'preferences', label: t('settings.preferences'), icon: 'options-outline', route: '/settings/preferences' },
    { id: 'data', label: t('settings.dataBackup'), icon: 'cloud-outline', route: '/settings/data' },
    { id: 'privacy', label: t('settings.privacy'), icon: 'shield-checkmark-outline', route: '/settings/privacy' },
    { id: 'help', label: t('settings.help'), icon: 'help-circle-outline', route: '/settings/help' },
    { id: 'about', label: t('settings.about'), icon: 'information-circle-outline', route: '/settings/about' },
  ];

  const listPaneContent = (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
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

        <View style={{ gap: spacing.xs }}>
          {sections.map((section) => (
            <Pressable
              key={section.id}
              onPress={() => {
                setSelectedSection(section.id);
              }}
              style={({ pressed }) => [
                styles.sectionRow,
                {
                  backgroundColor: selectedSection === section.id ? colors.surfaceSunken : pressed ? colors.surfaceSunken : 'transparent',
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                },
              ]}
            >
              <Text variant="bodyMedium" color={colors.textPrimary}>
                {section.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: spacing.xxl, alignItems: 'center', gap: spacing.xs }}>
          <Text variant="caption" color={colors.textSecondary}>
            {t('settings.version', { version, build })}
          </Text>
        </View>
      </ScrollView>
    </View>
  );

  const renderDetailPane = () => {
    if (!selectedSection) {
      return (
        <SplitViewEmptyState
          icon="settings-outline"
          message={t('settings.iPadEmptyMessage')}
          hint={t('settings.iPadEmptyHint')}
        />
      );
    }

    switch (selectedSection) {
      case 'business-profile':
        return <BusinessProfileDetailPane />;
      
      case 'quotes-invoices':
        return (
          <GenericDetailPane
            title={t('settings.quotesInvoices')}
            subtitle={t('quotesInvoices.subtitle')}
            items={[
              { label: t('quotesInvoices.defaultDueDays'), value: `${profile?.defaultDueDays || 14} ${t('common.days')}` },
            ]}
            fullScreenHref="/settings/quotes-invoices"
          />
        );
      
      case 'branding':
        return <BrandingDetailPane />;
      
      case 'avatar':
        return (
          <GenericDetailPane
            title={t('settings.changeAvatar')}
            subtitle={t('avatar.subtitle')}
            items={[{ label: t('avatar.current'), value: t('avatar.customAvatar') }]}
            fullScreenHref="/settings/avatar"
          />
        );
      
      case 'appearance':
        return <AppearanceDetailPane />;
      
      case 'language':
        return <LanguageDetailPane />;
      
      case 'preferences':
        return (
          <GenericDetailPane
            title={t('settings.preferences')}
            subtitle={t('preferences.subtitle')}
            items={[
              { label: t('preferences.defaultStageLabel'), value: t('preferences.defaultStageValue') },
            ]}
            fullScreenHref="/settings/preferences"
          />
        );
      
      case 'data':
        return (
          <GenericDetailPane
            title={t('settings.dataBackup')}
            subtitle={t('data.subtitle')}
            items={[
              { label: t('data.iCloudStatus'), value: t('data.iCloudStatusValue') },
            ]}
            fullScreenHref="/settings/data"
          />
        );
      
      case 'privacy':
        return (
          <GenericDetailPane
            title={t('settings.privacy')}
            subtitle={t('privacy.subtitle')}
            items={[
              { label: t('privacy.dataCollection'), value: t('privacy.dataCollectionValue') },
            ]}
            fullScreenHref="/settings/privacy"
          />
        );
      
      case 'help':
        return (
          <GenericDetailPane
            title={t('settings.help')}
            subtitle={t('help.subtitle')}
            items={[
              { label: t('help.version'), value: version },
              { label: t('help.build'), value: build },
            ]}
            fullScreenHref="/settings/help"
          />
        );
      
      case 'about':
        return (
          <GenericDetailPane
            title={t('settings.about')}
            subtitle={t('about.subtitle')}
            items={[
              { label: t('about.version'), value: `${version} (${build})` },
              { label: t('about.developer'), value: 'Trade Report' },
            ]}
            fullScreenHref="/settings/about"
          />
        );
      
      default:
        const section = sections.find((s) => s.id === selectedSection);
        if (!section) return null;
        
        return (
          <View style={{ flex: 1, padding: spacing.xl, gap: spacing.lg }}>
            <View>
              <Text variant="h2" style={{ marginBottom: spacing.sm }}>
                {section.label}
              </Text>
              <Text variant="body" color={colors.textSecondary}>
                {t('settings.iPadDetailHint')}
              </Text>
            </View>
            <Button
              label={t('settings.openFullScreen')}
              variant="accent"
              onPress={() => router.push(section.route)}
            />
          </View>
        );
    }
  };

  const detailPaneContent = renderDetailPane();

  return (
    <Screen edges={['top', 'left', 'right']}>
      <SplitView list={listPaneContent} detail={detailPaneContent} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  profileText: {
    flex: 1,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
});

import { router } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';

import { Button, Text } from '@/components';
import { LocalImage } from '@/components/LocalImage';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { SettingsDetailPane } from './SettingsDetailPanes';

export function BusinessProfileDetailPane() {
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();
  const { profile } = useBusinessProfile();

  return (
    <SettingsDetailPane
      title={t('settings.businessProfile')}
      subtitle={t('businessProfile.subtitle')}
      fullScreenHref="/settings/business-profile"
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: spacing.md,
            gap: spacing.sm,
          },
        ]}
      >
        {profile?.logoUri ? (
          <Pressable
            onPress={() => router.push('/settings/business-profile')}
            accessibilityRole="button"
            accessibilityLabel={t('businessProfile.logoLabel')}
          >
            <LocalImage
              uri={profile.logoUri}
              style={[styles.logo, { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }]}
              contentFit="contain"
            />
          </Pressable>
        ) : null}

        <View style={styles.row}>
          <Text variant="label" color={colors.textSecondary}>
            {t('businessProfile.businessName')}
          </Text>
          <Text variant="bodyMedium">{profile?.businessName || '-'}</Text>
        </View>

        <View style={styles.row}>
          <Text variant="label" color={colors.textSecondary}>
            {t('businessProfile.ownerName')}
          </Text>
          <Text variant="bodyMedium">{profile?.ownerName || '-'}</Text>
        </View>

        {profile?.email ? (
          <View style={styles.row}>
            <Text variant="label" color={colors.textSecondary}>
              {t('businessProfile.email')}
            </Text>
            <Text variant="body" numberOfLines={1}>
              {profile.email}
            </Text>
          </View>
        ) : null}

        {profile?.phone ? (
          <View style={styles.row}>
            <Text variant="label" color={colors.textSecondary}>
              {t('businessProfile.phone')}
            </Text>
            <Text variant="body">{profile.phone}</Text>
          </View>
        ) : null}

        {profile?.address ? (
          <View style={styles.row}>
            <Text variant="label" color={colors.textSecondary}>
              {t('businessProfile.address')}
            </Text>
            <Text variant="body" numberOfLines={2}>
              {profile.address}
            </Text>
          </View>
        ) : null}
      </View>
    </SettingsDetailPane>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  row: {
    gap: 4,
  },
  logo: {
    width: 120,
    height: 60,
    alignSelf: 'flex-start',
  },
});

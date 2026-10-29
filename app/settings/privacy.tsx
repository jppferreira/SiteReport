import { router } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { NavigationHeader, Screen, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

function Paragraph({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text variant="h3" style={{ marginBottom: 6 }}>
        {title}
      </Text>
      <Text variant="body" color={colors.textSecondary}>
        {children}
      </Text>
    </View>
  );
}

export default function PrivacyScreen() {
  const { spacing } = useTheme();
  const { t } = useI18n();

  return (
    <Screen>
      <NavigationHeader title={t('privacy.title')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        <Paragraph title={t('privacy.deviceDataTitle')}>{t('privacy.deviceDataBody')}</Paragraph>
        <Paragraph title={t('privacy.leavesDeviceTitle')}>{t('privacy.leavesDeviceBody')}</Paragraph>
        <Paragraph title={t('privacy.backupTitle')}>{t('privacy.backupBody')}</Paragraph>
        <Paragraph title={t('privacy.bugReportsTitle')}>{t('privacy.bugReportsBody')}</Paragraph>
        <Paragraph title={t('privacy.noAccountTitle')}>{t('privacy.noAccountBody')}</Paragraph>
        <Paragraph title={t('privacy.purchasesTitle')}>{t('privacy.purchasesBody')}</Paragraph>
        <Paragraph title={t('privacy.deletingTitle')}>{t('privacy.deletingBody')}</Paragraph>
        <Paragraph title={t('privacy.analyticsTitle')}>{t('privacy.analyticsBody')}</Paragraph>
      </ScrollView>
    </Screen>
  );
}

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

export default function TermsScreen() {
  const { spacing } = useTheme();
  const { t } = useI18n();

  return (
    <Screen>
      <NavigationHeader title={t('terms.title')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        <Paragraph title={t('terms.usingTitle')}>{t('terms.usingBody')}</Paragraph>
        <Paragraph title={t('terms.contentTitle')}>{t('terms.contentBody')}</Paragraph>
        <Paragraph title={t('terms.freeProTitle')}>{t('terms.freeProBody')}</Paragraph>
        <Paragraph title={t('terms.subscriptionsTitle')}>{t('terms.subscriptionsBody')}</Paragraph>
        <Paragraph title={t('terms.bugReportsTitle')}>{t('terms.bugReportsBody')}</Paragraph>
        <Paragraph title={t('terms.asIsTitle')}>{t('terms.asIsBody')}</Paragraph>
        <Paragraph title={t('terms.contactTitle')}>{t('terms.contactBody')}</Paragraph>
      </ScrollView>
    </Screen>
  );
}

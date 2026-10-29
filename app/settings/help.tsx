import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { NavigationHeader, Screen, SettingRow, Text } from '@/components';
import { SettingsGroup } from '@/features/settings/SettingsGroup';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

export default function HelpScreen() {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();

  const faq = useMemo(
    () => [
      { question: t('help.faqUploadQ'), answer: t('help.faqUploadA') },
      { question: t('help.faqOfflineQ'), answer: t('help.faqOfflineA') },
      { question: t('help.faqDeleteAppQ'), answer: t('help.faqDeleteAppA') },
    ],
    [t]
  );

  return (
    <Screen>
      <NavigationHeader title={t('help.title')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        <SettingsGroup title={t('help.groupContact')}>
          <SettingRow
            label={t('help.emailSupport')}
            icon="mail-outline"
            onPress={() => Linking.openURL('mailto:hello@jppferreira.com')}
          />
          <SettingRow
            label={t('help.reportABug')}
            icon="bug-outline"
            onPress={() => router.push('/settings/bug-report')}
          />
        </SettingsGroup>

        <View style={{ marginTop: spacing.sm }}>
          {faq.map((item) => (
            <View key={item.question} style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Ionicons name="help-circle-outline" size={18} color={colors.textSecondary} style={{ marginTop: 2 }} />
                <Text variant="bodyMedium" style={{ flex: 1 }}>
                  {item.question}
                </Text>
              </View>
              <Text variant="body" color={colors.textSecondary} style={{ marginTop: 6, marginLeft: 26 }}>
                {item.answer}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

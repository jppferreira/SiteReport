import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { NavigationHeader, Screen, SettingRow, Text } from '@/components';
import { SettingsGroup } from '@/features/settings/SettingsGroup';
import { useTheme } from '@/theme';

const FAQ = [
  {
    question: 'Will my photos and customer details ever be uploaded?',
    answer: 'No. Everything you record stays on your device unless you choose to share a report yourself.',
  },
  {
    question: 'Can I use SiteReport without an internet connection?',
    answer: 'Yes. Creating jobs, taking photos, writing notes, signing and generating reports all work offline.',
  },
  {
    question: 'What happens to my data if I delete the app?',
    answer: 'All job data lives in the app\'s local storage, so uninstalling the app removes it permanently.',
  },
];

export default function HelpScreen() {
  const { colors, spacing } = useTheme();

  return (
    <Screen>
      <NavigationHeader title="Help" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        <SettingsGroup title="Contact">
          <SettingRow
            label="Email support"
            icon="mail-outline"
            onPress={() => Linking.openURL('mailto:support@sitereportapp.com')}
          />
        </SettingsGroup>

        <View style={{ marginTop: spacing.sm }}>
          {FAQ.map((item) => (
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

import { router } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { NavigationHeader, Screen, Text } from '@/components';
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

  return (
    <Screen>
      <NavigationHeader title="Privacy policy" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        <Paragraph title="Your job data stays on your device">
          Jobs, customer names, addresses, job notes, photos, signatures and generated PDF reports are stored
          only in this app&rsquo;s local storage on your phone or tablet. SiteReport does not operate a server that
          receives, stores, or processes this information, and it is never uploaded automatically.
        </Paragraph>
        <Paragraph title="What leaves your device">
          Information leaves your device only when you explicitly choose to share or export it — for example,
          sending a report through the share sheet, or exporting your data to send to yourself. SiteReport does
          not transmit customer names, addresses, job notes, photos, signatures, or report contents to our
          servers at any point.
        </Paragraph>
        <Paragraph title="No account required">
          SiteReport does not require you to create an account or sign in. There is no server-side user
          database.
        </Paragraph>
        <Paragraph title="Purchases">
          Subscription and lifetime purchases are processed by Apple&rsquo;s App Store or Google&rsquo;s Play Store. Those
          providers process your payment information according to their own privacy policies; SiteReport only
          receives confirmation of your entitlement, never your payment details.
        </Paragraph>
        <Paragraph title="Deleting your data">
          You can delete an individual job, or all app data, at any time from Settings → Data & privacy.
          Deleting a job removes its photos, signature and generated reports from your device immediately.
        </Paragraph>
        <Paragraph title="Analytics">
          SiteReport does not collect analytics containing any customer or job information.
        </Paragraph>
      </ScrollView>
    </Screen>
  );
}

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

export default function TermsScreen() {
  const { colors, spacing } = useTheme();

  return (
    <Screen>
      <NavigationHeader title="Terms of use" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        <Paragraph title="Using SiteReport">
          SiteReport is provided to help you capture job photos, notes and signatures, and generate PDF
          reports from information you enter. You are responsible for the accuracy of the information you
          record and share with your customers.
        </Paragraph>
        <Paragraph title="Your content">
          Jobs, photos, notes and signatures you create remain yours. SiteReport stores this content locally
          on your device and does not claim ownership of it.
        </Paragraph>
        <Paragraph title="Subscriptions">
          Pro features are available via auto-renewing subscription or a one-time lifetime purchase, billed
          through the App Store or Play Store. Subscriptions renew automatically unless cancelled at least 24
          hours before the end of the current period, managed through your store account settings.
        </Paragraph>
        <Paragraph title="No warranty">
          SiteReport is provided &ldquo;as is&rdquo;. While we aim for reports to be accurate and reliable, you should
          review each report before sending it to a customer.
        </Paragraph>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
          This is a standard terms template. Replace with terms reviewed by your legal counsel before
          publishing to the App Store or Google Play.
        </Text>
      </ScrollView>
    </Screen>
  );
}

import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/core/AppText';
import { Card } from '@/components/core/Card';
import { colors, spacing } from '@/theme';

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="h2">Privacy</AppText>
        <Card style={styles.card}>
          <Bullet text="Job information is stored locally on your device." />
          <Bullet text="Customer information is not uploaded to our servers." />
          <Bullet text="Photos remain locally managed by the app/device." />
          <Bullet text="Reports are generated locally on your device." />
          <Bullet text="Information leaves your device only when you explicitly share a report." />
          <Bullet text="App Store / Google Play purchase providers process purchase data under their own policies." />
        </Card>
        <AppText variant="bodySmall" color={colors.textSecondary}>
          If you delete app data or uninstall the app, local job data and files are permanently removed from this device.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <AppText variant="body" style={styles.bullet}>
      • {text}
    </AppText>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.x5,
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  bullet: {
    lineHeight: 24,
  },
});

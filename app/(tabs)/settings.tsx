import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/core/AppText';
import { Card } from '@/components/core/Card';
import { SectionHeader } from '@/components/core/SectionHeader';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useAppState } from '@/hooks/useAppState';
import { jobService } from '@/services/jobService';
import { purchaseService } from '@/services/purchaseService';
import { settingsService, type AppPreferences } from '@/services/settingsService';
import { fileService } from '@/services/fileService';
import { colors, spacing } from '@/theme';
import { formatBytes } from '@/utils/format';

export default function SettingsTab() {
  const router = useRouter();
  const { preferences, refreshPreferences, refreshEntitlement, entitlement } = useAppState();
  const [storageUsage, setStorageUsage] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadUsage = useCallback(async () => {
    const usage = await fileService.getStorageUsage();
    setStorageUsage(usage.total);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadUsage();
    }, [loadUsage])
  );

  const updatePreference = async <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    setLoading(true);
    await settingsService.updatePreference(key, value);
    await refreshPreferences();
    setLoading(false);
  };

  const deleteAllData = async () => {
    Alert.alert(
      'Delete all app data?',
      'This will permanently remove jobs, photos, signatures and reports from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all data',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setLoading(true);
              await jobService.deleteAllData();
              await loadUsage();
              setLoading(false);
            })();
          },
        },
      ]
    );
  };

  const restore = async () => {
    setLoading(true);
    await purchaseService.restorePurchases();
    await refreshEntitlement();
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {loading ? <LoadingState label="Saving…" /> : null}
        <SectionHeader title="Settings" subtitle="Your job data stays on your device." />

        <Card style={styles.card}>
          <AppText variant="h3">Business</AppText>
          <SettingRow label="Business profile" onPress={() => router.push('/settings/business-profile')} />
          <SettingRow label="Report branding" onPress={() => router.push('/settings/business-profile')} />
        </Card>

        <Card style={styles.card}>
          <AppText variant="h3">Preferences</AppText>
          <ToggleRow
            label="High photo quality"
            description="Larger files with higher detail in reports."
            value={preferences.defaultPhotoQuality === 'high'}
            onValueChange={(value) => updatePreference('defaultPhotoQuality', value ? 'high' : 'balanced')}
          />
          <ToggleRow
            label="Include signature by default"
            description="Show signature section in report flows."
            value={preferences.includeSignatureByDefault}
            onValueChange={(value) => updatePreference('includeSignatureByDefault', value)}
          />
        </Card>

        <Card style={styles.card}>
          <AppText variant="h3">Data & privacy</AppText>
          <ValueRow label="Storage usage" value={formatBytes(storageUsage)} />
          <SettingRow label="Privacy" onPress={() => router.push('/settings/privacy')} />
          <SettingRow label="Delete all app data" destructive onPress={deleteAllData} />
        </Card>

        <Card style={styles.card}>
          <AppText variant="h3">Account / purchase</AppText>
          <ValueRow label="Pro access" value={entitlement.hasProAccess ? 'Active' : 'Free'} />
          <SettingRow label="Manage subscription" onPress={() => router.push('/paywall')} />
          <SettingRow label="Restore purchases" onPress={() => void restore()} />
        </Card>

        <Card style={styles.card}>
          <AppText variant="h3">About</AppText>
          <ValueRow label="Version" value="1.0.0" />
          <ValueRow label="Build" value="1" />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button">
      <AppText variant="body" color={destructive ? colors.destructive : colors.textPrimary}>
        {label}
      </AppText>
      <AppText variant="bodySmall" color={colors.textSecondary}>
        ›
      </AppText>
    </Pressable>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText variant="body">{label}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {description}
        </AppText>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="body">{label}</AppText>
      <AppText variant="bodySmall" color={colors.textSecondary}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.x5,
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
});

import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';

import { NavigationHeader, Screen, SettingRow, Text, useToast } from '@/components';
import { DeleteAllDataDialog } from '@/features/settings/DeleteAllDataDialog';
import { SettingsGroup } from '@/features/settings/SettingsGroup';
import { deleteAllAppData, exportAppDataToJson } from '@/services/dataManagementService';
import { getStorageUsage, StorageUsage } from '@/services/fileService';
import { shareFile } from '@/services/shareService';
import { useTheme } from '@/theme';
import { formatFileSize } from '@/utils/format';

export default function DataPrivacyScreen() {
  const { colors, spacing } = useTheme();
  const { showToast } = useToast();
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getStorageUsage().then(setUsage);
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const path = await exportAppDataToJson();
      const shared = await shareFile(path, 'Export job data');
      if (!shared) showToast({ message: 'Sharing is not available on this device', tone: 'warning' });
    } catch {
      showToast({ message: "We couldn't export your data", tone: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      await deleteAllAppData();
      showToast({ message: 'All job data deleted', tone: 'neutral' });
      setConfirmDelete(false);
      router.replace('/(tabs)/jobs');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen>
      <NavigationHeader title="Data & privacy" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        <Text variant="body" color={colors.textSecondary} style={{ marginBottom: spacing.lg }}>
          Your job data stays on your device. Nothing here is uploaded to our servers.
        </Text>

        <SettingsGroup title="Storage">
          <SettingRow label="Used by SiteReport" value={usage ? formatFileSize(usage.totalBytes) : '—'} icon="server-outline" showChevron={false} />
          <SettingRow label="Free device storage" value={usage ? formatFileSize(usage.freeBytes) : '—'} icon="hardware-chip-outline" showChevron={false} />
        </SettingsGroup>

        <SettingsGroup title="Export">
          <SettingRow
            label={exporting ? 'Preparing export…' : 'Export data'}
            icon="download-outline"
            onPress={exporting ? undefined : handleExport}
          />
        </SettingsGroup>

        <SettingsGroup title="Danger zone">
          <SettingRow label="Delete all app data" icon="trash-outline" destructive onPress={() => setConfirmDelete(true)} />
        </SettingsGroup>
      </ScrollView>

      <DeleteAllDataDialog
        visible={confirmDelete}
        onConfirm={handleDeleteAll}
        onCancel={() => setConfirmDelete(false)}
        loading={deleting}
      />
    </Screen>
  );
}

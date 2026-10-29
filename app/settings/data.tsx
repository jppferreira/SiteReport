import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView } from 'react-native';

import { ConfirmationDialog, NavigationHeader, Screen, SettingRow, Text, ToggleRow, useToast } from '@/components';
import { DeleteAllDataDialog } from '@/features/settings/DeleteAllDataDialog';
import { SettingsGroup } from '@/features/settings/SettingsGroup';
import { useIcloudAutoBackupSetting } from '@/hooks/useIcloudAutoBackupSetting';
import { useI18n } from '@/i18n/useI18n';
import { BackupDestination, restoreBackupFromPicker, saveBackup } from '@/services/backup/backupService';
import { deleteAllAppData, exportAppDataToJson } from '@/services/dataManagementService';
import { getStorageUsage, StorageUsage } from '@/services/fileService';
import { shareFile } from '@/services/shareService';
import { useTheme } from '@/theme';
import { formatFileSize } from '@/utils/format';

const IS_IOS = Platform.OS === 'ios';

export default function DataPrivacyScreen() {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<BackupDestination | null>(null);
  const [icloudAutoBackup, setIcloudAutoBackup] = useIcloudAutoBackupSetting();

  const backupPrompt = useMemo(
    () =>
      ({
        icloud: {
          title: t('data.backupIcloudTitle'),
          description: t('data.backupIcloudDescription'),
        },
        'google-drive': {
          title: t('data.backupGoogleTitle'),
          description: t('data.backupGoogleDescription'),
        },
        manual: {
          title: t('data.backupManualTitle'),
          description: t('data.backupManualDescription'),
        },
      }) as Record<BackupDestination, { title: string; description: string }>,
    [t]
  );

  useEffect(() => {
    getStorageUsage().then(setUsage);
  }, []);

  const handleBackup = async (destination: BackupDestination) => {
    setBackupBusy(true);
    try {
      const result = await saveBackup(destination);
      if (result === 'saved') showToast({ message: t('data.toastBackupSaved'), tone: 'success' });
    } catch {
      showToast({ message: t('data.toastBackupError'), tone: 'destructive' });
    } finally {
      setBackupBusy(false);
    }
  };

  const handleRestore = async () => {
    setConfirmRestore(false);
    setBackupBusy(true);
    try {
      const result = await restoreBackupFromPicker();
      if (result.ok) {
        showToast({ message: t('data.toastRestored'), tone: 'success' });
        router.replace('/(tabs)/jobs');
        return;
      }
      if ('cancelled' in result) return;
      showToast({ message: result.message, tone: 'destructive' });
    } finally {
      setBackupBusy(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const path = await exportAppDataToJson();
      const shared = await shareFile(path, t('data.exportShareTitle'));
      if (!shared) showToast({ message: t('data.toastShareUnavailable'), tone: 'warning' });
    } catch {
      showToast({ message: t('data.toastExportError'), tone: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      await deleteAllAppData();
      showToast({ message: t('data.toastAllDeleted'), tone: 'neutral' });
      setConfirmDelete(false);
      router.replace('/(tabs)/jobs');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen>
      <NavigationHeader title={t('data.title')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        {IS_IOS ? (
          <Text variant="body" color={colors.textSecondary} style={{ marginBottom: spacing.lg }}>
            {t('data.icloudIntro')}
          </Text>
        ) : null}

        <SettingsGroup title={t('data.groupStorage')}>
          <SettingRow
            label={t('data.usedByApp')}
            value={usage ? formatFileSize(usage.totalBytes) : '—'}
            icon="server-outline"
            showChevron={false}
          />
          <SettingRow
            label={t('data.freeDeviceStorage')}
            value={usage ? formatFileSize(usage.freeBytes) : '—'}
            icon="hardware-chip-outline"
            showChevron={false}
          />
        </SettingsGroup>

        <Text variant="body" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
          {IS_IOS ? t('data.backupIntroIos') : t('data.backupIntroOther')}
        </Text>
        <SettingsGroup title={t('data.groupBackup')}>
          {IS_IOS ? (
            <ToggleRow
              label={t('data.icloudAutoBackup')}
              description={t('data.icloudAutoBackupDescription')}
              value={icloudAutoBackup}
              onValueChange={setIcloudAutoBackup}
            />
          ) : null}
          {IS_IOS ? (
            <SettingRow
              label={backupBusy ? t('data.working') : t('data.saveToIcloud')}
              icon="cloud-upload-outline"
              onPress={backupBusy ? undefined : () => setPendingBackup('icloud')}
            />
          ) : null}
          <SettingRow
            label={backupBusy ? t('data.working') : t('data.saveToGoogleDrive')}
            icon="logo-google"
            onPress={backupBusy ? undefined : () => setPendingBackup('google-drive')}
          />
          <SettingRow
            label={backupBusy ? t('data.working') : t('data.saveACopy')}
            icon="folder-outline"
            onPress={backupBusy ? undefined : () => setPendingBackup('manual')}
          />
          <SettingRow
            label={t('data.restoreFromBackup')}
            icon="cloud-download-outline"
            onPress={backupBusy ? undefined : () => setConfirmRestore(true)}
          />
        </SettingsGroup>

        <SettingsGroup title={t('data.groupTextExport')}>
          <SettingRow
            label={exporting ? t('data.preparingExport') : t('data.exportTextSummary')}
            icon="download-outline"
            onPress={exporting || backupBusy ? undefined : handleExport}
          />
        </SettingsGroup>

        <SettingsGroup title={t('data.groupDanger')}>
          <SettingRow
            label={t('data.deleteAllAppData')}
            icon="trash-outline"
            destructive
            onPress={() => setConfirmDelete(true)}
          />
        </SettingsGroup>
      </ScrollView>

      <ConfirmationDialog
        visible={pendingBackup !== null}
        title={pendingBackup ? backupPrompt[pendingBackup].title : ''}
        description={pendingBackup ? backupPrompt[pendingBackup].description : undefined}
        confirmLabel={t('data.chooseFolder')}
        confirmVariant="primary"
        onConfirm={() => {
          const destination = pendingBackup;
          setPendingBackup(null);
          if (destination) void handleBackup(destination);
        }}
        onCancel={() => setPendingBackup(null)}
      />

      <ConfirmationDialog
        visible={confirmRestore}
        title={t('data.restoreTitle')}
        description={t('data.restoreDescription')}
        confirmLabel={t('data.chooseBackup')}
        onConfirm={handleRestore}
        onCancel={() => setConfirmRestore(false)}
      />

      <DeleteAllDataDialog
        visible={confirmDelete}
        onConfirm={handleDeleteAll}
        onCancel={() => setConfirmDelete(false)}
        loading={deleting}
      />
    </Screen>
  );
}

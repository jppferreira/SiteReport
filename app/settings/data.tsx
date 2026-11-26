import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView } from 'react-native';

import { ConfirmationDialog, NavigationHeader, Screen, SettingRow, Text, ToggleRow, useToast } from '@/components';
import { BackupPasswordSheet } from '@/features/backup/BackupPasswordSheet';
import { DeleteAllDataDialog } from '@/features/settings/DeleteAllDataDialog';
import { SettingsGroup } from '@/features/settings/SettingsGroup';
import { useIcloudAutoBackupSetting } from '@/hooks/useIcloudAutoBackupSetting';
import { useI18n } from '@/i18n/useI18n';
import { shareAccountantExport } from '@/services/accountantExport';
import {
  BackupDestination,
  pickBackupFile,
  restoreBackupBytes,
  saveBackup,
  userFacingBackupError,
} from '@/services/backup/backupService';
import { googleDriveAvailable } from '@/services/backup/googleDrive';
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
  const [accountantBusy, setAccountantBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<BackupDestination | null>(null);
  const [backupPasswordOpen, setBackupPasswordOpen] = useState(false);
  const [restorePasswordOpen, setRestorePasswordOpen] = useState(false);
  const [pendingRestoreBytes, setPendingRestoreBytes] = useState<Uint8Array | null>(null);
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

  const handleBackup = async (destination: BackupDestination, password?: string) => {
    setBackupBusy(true);
    try {
      const result = await saveBackup(destination, password ? { password } : undefined);
      if (result !== 'saved') return;
      const message =
        destination === 'icloud'
          ? t('data.toastIcloudSaved')
          : destination === 'google-drive' && Platform.OS === 'android'
            ? t('data.toastGoogleDriveSaved')
            : t('data.toastBackupSaved');
      showToast({ message, tone: 'success' });
    } catch (error) {
      showToast({ message: userFacingBackupError(error, t('data.toastBackupError')), tone: 'destructive' });
    } finally {
      setBackupBusy(false);
    }
  };

  const finishRestore = async (bytes: Uint8Array, password?: string) => {
    setBackupBusy(true);
    try {
      const result = await restoreBackupBytes(bytes, password);
      if (result.ok) {
        showToast({ message: t('data.toastRestored'), tone: 'success' });
        router.replace('/(tabs)/jobs');
        return;
      }
      if ('cancelled' in result) return;
      showToast({ message: result.message, tone: 'destructive' });
    } finally {
      setBackupBusy(false);
      setPendingRestoreBytes(null);
      setRestorePasswordOpen(false);
    }
  };

  const handleRestore = async () => {
    // Keep the confirm sheet mounted until the system file picker is open —
    // dismissing first can cancel the pick on Android.
    setBackupBusy(true);
    try {
      const picked = await pickBackupFile();
      setConfirmRestore(false);
      if (picked.kind === 'cancelled') return;
      if (picked.encrypted) {
        setPendingRestoreBytes(picked.bytes);
        setRestorePasswordOpen(true);
        return;
      }
      await finishRestore(picked.bytes);
    } catch {
      setConfirmRestore(false);
      showToast({ message: t('backup.couldNotOpen'), tone: 'destructive' });
    } finally {
      setBackupBusy(false);
    }
  };

  const handleAccountantExport = async () => {
    setAccountantBusy(true);
    try {
      const shared = await shareAccountantExport();
      if (!shared) showToast({ message: t('data.toastShareUnavailable'), tone: 'warning' });
    } catch {
      showToast({ message: t('data.toastAccountantExportError'), tone: 'destructive' });
    } finally {
      setAccountantBusy(false);
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
          {IS_IOS
            ? t('data.backupIntroIos')
            : Platform.OS === 'android'
              ? t('data.backupIntroAndroid')
              : t('data.backupIntroOther')}
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
          {Platform.OS === 'android' ? (
            <SettingRow
              label={backupBusy ? t('data.working') : t('data.saveToGoogleDrive')}
              icon="logo-google"
              onPress={backupBusy ? undefined : () => setPendingBackup('google-drive')}
            />
          ) : null}
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
          <SettingRow
            label={accountantBusy ? t('data.preparingExport') : t('data.exportForAccountant')}
            icon="calculator-outline"
            onPress={accountantBusy || backupBusy ? undefined : handleAccountantExport}
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
        // Hide while the password sheet is up — presenting a second modal on top of this
        // one fails on iOS ("already presenting") and leaves Save stuck.
        visible={pendingBackup !== null && !backupPasswordOpen}
        title={pendingBackup ? backupPrompt[pendingBackup].title : ''}
        description={pendingBackup ? backupPrompt[pendingBackup].description : undefined}
        confirmLabel={
          pendingBackup === 'icloud'
            ? t('common.save')
            : pendingBackup === 'google-drive'
              ? googleDriveAvailable() === 'share'
                ? t('data.shareToGoogleDrive')
                : t('data.chooseInGoogleDrive')
              : t('data.chooseFolder')
        }
        confirmVariant="primary"
        onConfirm={() => {
          setBackupPasswordOpen(true);
        }}
        onCancel={() => setPendingBackup(null)}
      />

      <BackupPasswordSheet
        visible={backupPasswordOpen}
        mode="save"
        loading={backupBusy}
        onCancel={() => {
          setBackupPasswordOpen(false);
          setPendingBackup(null);
        }}
        onConfirm={(password) => {
          const destination = pendingBackup;
          setBackupPasswordOpen(false);
          setPendingBackup(null);
          // Wait for the password modal to finish dismissing before opening
          // ACTION_CREATE_DOCUMENT — launching during dismiss cancels/fails on Android.
          if (destination) {
            setTimeout(() => {
              void handleBackup(destination, password ?? undefined);
            }, 450);
          }
        }}
      />

      <BackupPasswordSheet
        visible={restorePasswordOpen}
        mode="restore"
        loading={backupBusy}
        onCancel={() => {
          setRestorePasswordOpen(false);
          setPendingRestoreBytes(null);
        }}
        onConfirm={(password) => {
          if (!pendingRestoreBytes || !password) return;
          void finishRestore(pendingRestoreBytes, password);
        }}
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

import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { Button, NavigationHeader, Screen, Text, useToast } from '@/components';
import { getDatabase } from '@/database/client';
import { restoreBackupBytes } from '@/services/backup/backupService';
import { base64ToBytes } from '@/services/fileUri';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

const CACHE_NAME = 'tradesreport-backup-annotated-e2e.zip';

/**
 * Dev-only: restore a zip placed at cache/tradesreport-backup-annotated-e2e.zip
 * (adb push / run-as). Used to prove annotation round-trip without DocumentsUI.
 */
export default function RestoreE2eScreen() {
  const { colors, spacing } = useTheme();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(`Expect cache/${CACHE_NAME}`);

  const run = async () => {
    setBusy(true);
    try {
      const root = FileSystem.cacheDirectory;
      if (!root) {
        setStatus('No cacheDirectory');
        return;
      }
      const uri = `${root}${CACHE_NAME}`;
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) {
        setStatus(`Missing ${CACHE_NAME} in cache`);
        showToast({ message: `Missing ${CACHE_NAME}`, tone: 'destructive' });
        return;
      }
      setStatus('Reading zip…');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = base64ToBytes(base64);
      setStatus(`Restoring ${bytes.byteLength} bytes…`);
      const result = await restoreBackupBytes(bytes);
      if (!result.ok) {
        const message =
          'cancelled' in result && result.cancelled
            ? 'Cancelled'
            : 'message' in result
              ? result.message
              : 'Restore failed';
        setStatus(message);
        showToast({ message, tone: 'destructive' });
        return;
      }
      const db = await getDatabase();
      const photo = await db.getFirstAsync<{ annotations: string | null }>(
        `SELECT annotations FROM photos LIMIT 1`
      );
      const note =
        typeof photo?.annotations === 'string' && photo.annotations.includes('Damaged unit')
          ? 'PASS: Damaged unit restored'
          : `Restored; annotations=${photo?.annotations?.slice(0, 80) ?? 'null'}`;
      setStatus(note);
      logger.info('Restore E2E', { note });
      showToast({ message: note, tone: note.startsWith('PASS') ? 'success' : 'warning' });
    } catch (error) {
      const message = String(error);
      setStatus(message);
      logger.warn('Restore E2E failed', { error: message });
      showToast({ message, tone: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (!__DEV__) {
    return (
      <Screen>
        <NavigationHeader title="Restore E2E" onBack={() => router.back()} />
        <Text style={{ padding: spacing.lg }}>Dev builds only.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <NavigationHeader title="Restore E2E" onBack={() => router.back()} />
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Text variant="body" color={colors.textSecondary}>
          Restores cache/{CACHE_NAME} and checks for Damaged unit annotation.
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {status}
        </Text>
        <Button label={busy ? 'Working…' : 'Restore annotated zip'} onPress={run} disabled={busy} />
      </View>
    </Screen>
  );
}

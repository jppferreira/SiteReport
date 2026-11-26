import { router } from 'expo-router';
import React, { useState } from 'react';
import { Platform, View } from 'react-native';

import { Button, NavigationHeader, Screen, Text, useToast } from '@/components';
import { saveBackup, userFacingBackupError } from '@/services/backup/backupService';
import { icloudDriveAvailable } from '@/services/backup/icloudDrive';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

/**
 * Dev-only harness for signed-in iCloud backup E2E.
 * Open via tradesreport://debug/icloud-e2e (or tradesreport-dev://…).
 */
export default function IcloudE2eScreen() {
  const { colors, spacing } = useTheme();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(
    Platform.OS === 'ios' ? `availability: ${icloudDriveAvailable()}` : 'iOS only'
  );

  const run = async () => {
    setBusy(true);
    setStatus(`availability: ${icloudDriveAvailable()} — packing…`);
    try {
      const result = await saveBackup('icloud');
      const message = result === 'saved' ? 'Backup saved to iCloud Drive' : `Result: ${result}`;
      setStatus(message);
      logger.info('iCloud E2E', { result });
      showToast({ message, tone: result === 'saved' ? 'success' : 'warning' });
    } catch (error) {
      const message = userFacingBackupError(error, 'iCloud E2E failed');
      setStatus(message);
      logger.warn('iCloud E2E failed', { error: String(error) });
      showToast({ message, tone: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (!__DEV__) {
    return (
      <Screen>
        <NavigationHeader title="iCloud E2E" onBack={() => router.back()} />
        <Text style={{ padding: spacing.lg }}>Dev builds only.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <NavigationHeader title="iCloud E2E" onBack={() => router.back()} />
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Text variant="body" color={colors.textSecondary}>
          Runs Save to iCloud Drive without the password sheet (no encryption).
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {status}
        </Text>
        <Button label={busy ? 'Working…' : 'Save to iCloud now'} onPress={run} disabled={busy} />
      </View>
    </Screen>
  );
}

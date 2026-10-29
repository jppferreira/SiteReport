import React, { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import { Button, Modal, Text } from '@/components';
import { ICLOUD_BACKUP_FILE_NAME, runIcloudAutoBackup, shouldShowIcloudTip } from '@/services/backup/icloudAutoBackup';
import { getPreferences, savePreferences } from '@/services/preferencesService';
import { useTheme } from '@/theme';

/** iOS-only: schedules iCloud auto-backup and shows the one-time Drive tip. */
export function IcloudAutoBackupHost() {
  const { colors, radius, spacing, shadows } = useTheme();
  const [tipVisible, setTipVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let active = true;
    getPreferences().then((preferences) => {
      if (!active) return;
      if (shouldShowIcloudTip({ seen: preferences.icloudBackupTipSeen, platform: Platform.OS })) {
        setTipVisible(true);
      }
    });

    const backup = () => {
      void runIcloudAutoBackup('schedule');
    };
    backup();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') backup();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  if (Platform.OS !== 'ios') return null;

  const dismissTip = () => {
    setTipVisible(false);
    void savePreferences({ icloudBackupTipSeen: true });
  };

  return (
    <Modal visible={tipVisible} onRequestClose={dismissTip}>
      <View
        accessibilityViewIsModal
        accessibilityRole="alert"
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl },
          shadows.overlay,
        ]}
      >
        <Text variant="h3">This backup is only in iCloud Drive</Text>
        <Text variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
          Trade Report does not keep a copy of this backup. It is stored only in your iCloud Drive. In the Files app,
          open iCloud Drive, then the Trade Report folder, and look for {ICLOUD_BACKUP_FILE_NAME}. If you delete it
          there, that backup is gone for good and cannot be restored. It is a backup, not a synced copy.
        </Text>
        <Button label="OK" onPress={dismissTip} style={{ marginTop: spacing.lg }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
});

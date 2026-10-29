import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { getPreferences, savePreferences } from '@/services/preferencesService';

const IS_IOS = Platform.OS === 'ios';

/** Preference toggle for iCloud auto-backup. No-ops off iOS. */
export function useIcloudAutoBackupSetting(): [boolean, (value: boolean) => void] {
  const [enabled, setEnabled] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!IS_IOS) return;
      let active = true;
      getPreferences().then((preferences) => {
        if (active) setEnabled(preferences.icloudAutoBackup);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const update = useCallback((value: boolean) => {
    if (!IS_IOS) return;
    setEnabled(value);
    void savePreferences({ icloudAutoBackup: value });
  }, []);

  return [enabled, update];
}

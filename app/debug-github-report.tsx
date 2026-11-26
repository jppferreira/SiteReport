import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { Text } from '@/components';
import { deliverBugReport } from '@/features/settings/bugReport';
import { useTheme } from '@/theme';
import * as Linking from 'expo-linking';

/**
 * Dev-only path to prove Contact → mail delivery from a real device/simulator.
 * Open: exp://HOST:PORT/--/debug-github-report
 *
 * Authenticated GitHub issue creation was removed so PATs are never shipped in the binary.
 */
export default function DebugGithubReportScreen() {
  const { colors, spacing } = useTheme();
  const [status, setStatus] = useState('Opening mail with a test report…');

  useEffect(() => {
    void deliverBugReport(
      {
        topic: 'bug',
        whatHappened: 'Live mobile → mail test from the simulator.',
        expected: 'A prefilled email to hello@jppferreira.com',
        steps: 'Opened /debug-github-report on device',
        appVersion: Constants.expoConfig?.version ?? '1.0.0',
        platform: Platform.OS,
      },
      (url) => Linking.openURL(url),
    )
      .then(() => {
        setStatus('Mail composer should be open with the test report.');
      })
      .catch(() => setStatus('Could not open mail from this device.'));
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Contact report test' }} />
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.background }}>
        <Text variant="h3" style={{ marginBottom: spacing.md }}>
          Contact → Mail
        </Text>
        <Text variant="body" color={colors.textSecondary} selectable>
          {status}
        </Text>
      </View>
    </>
  );
}

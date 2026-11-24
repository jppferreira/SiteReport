import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { Text } from '@/components';
import { deliverBugReport, githubBugReportToken } from '@/features/settings/bugReport';
import { useTheme } from '@/theme';
import * as Linking from 'expo-linking';

/**
 * Dev-only path to prove Contact → GitHub Issues from a real device/simulator.
 * Open: exp://HOST:PORT/--/debug-github-report
 */
export default function DebugGithubReportScreen() {
  const { colors, spacing } = useTheme();
  const [status, setStatus] = useState('Sending from this device…');

  useEffect(() => {
    const token = githubBugReportToken();
    if (!token) {
      setStatus('No GITHUB_BUG_REPORT_TOKEN in this build — would fall back to Mail.');
      return;
    }

    void deliverBugReport(
      {
        topic: 'bug',
        whatHappened: 'Live mobile → GitHub test from the iOS Simulator.',
        expected: 'A new issue on jppferreira/SiteReport',
        steps: 'Opened /debug-github-report on device',
        appVersion: Constants.expoConfig?.version ?? '1.0.0',
        platform: Platform.OS,
      },
      (url) => Linking.openURL(url),
    )
      .then((result) => {
        setStatus(
          result === 'delivered'
            ? 'Sent. Check GitHub Issues on jppferreira/SiteReport.'
            : 'GitHub failed — opened Mail fallback instead.',
        );
      })
      .catch(() => setStatus('Could not send from this device.'));
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'GitHub report test' }} />
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.background }}>
        <Text variant="h3" style={{ marginBottom: spacing.md }}>
          Mobile → GitHub
        </Text>
        <Text variant="body" color={colors.textSecondary} selectable>
          {status}
        </Text>
      </View>
    </>
  );
}

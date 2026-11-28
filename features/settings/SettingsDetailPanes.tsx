import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

type SettingsDetailPaneProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  fullScreenHref?: string;
};

/**
 * Generic settings detail pane for iPad split view.
 * Shows content inline with optional "Open Full Screen" button.
 */
export function SettingsDetailPane({ title, subtitle, children, fullScreenHref }: SettingsDetailPaneProps) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      <View>
        <Text variant="h2" style={{ marginBottom: spacing.sm }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" color={colors.textSecondary}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {children}

      {fullScreenHref ? (
        <Button
          label={t('settings.openFullScreen')}
          variant="secondary"
          onPress={() => {
            const { router } = require('expo-router');
            router.push(fullScreenHref);
          }}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

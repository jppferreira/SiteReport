import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

type SplitViewEmptyStateProps = {
  /** Icon name from Ionicons. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Main message. */
  message: string;
  /** Optional hint text below the message. */
  hint?: string;
};

/**
 * Empty state for the detail pane of a split view when nothing is selected.
 * Centered vertically and horizontally with an icon and message.
 */
export function SplitViewEmptyState({ icon = 'document-text-outline', message, hint }: SplitViewEmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={colors.borderStrong} />
      <Text variant="body" color={colors.textSecondary} style={{ marginTop: 16, textAlign: 'center' }}>
        {message}
      </Text>
      {hint ? (
        <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 8, textAlign: 'center' }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
});

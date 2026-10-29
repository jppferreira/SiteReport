import { Ionicons } from '@expo/vector-icons';
import { Image, ImageProps } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

type EmptyStateProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  /** Replaces the gray icon tile with a transparent illustration. */
  illustration?: ImageProps['source'];
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon = 'folder-open-outline',
  illustration,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.xl }]}>
      {illustration ? (
        <Image
          source={illustration}
          contentFit="contain"
          accessible={false}
          style={styles.illustration}
        />
      ) : (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: colors.surfaceSunken, borderRadius: radius.xl },
          ]}
        >
          <Ionicons name={icon} size={28} color={colors.textSecondary} />
        </View>
      )}
      <Text variant="h3" style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text variant="body" color={colors.textSecondary} style={styles.description}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  illustration: {
    width: '100%',
    maxWidth: 320,
    height: 248,
    marginBottom: 20,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  action: {
    marginTop: 24,
  },
});

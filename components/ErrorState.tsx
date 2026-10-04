import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

type ErrorStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorState({ title, description, actionLabel = 'Try again', onAction }: ErrorStateProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.xl }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.destructiveSoft, borderRadius: radius.xl }]}>
        <Ionicons name="alert-circle-outline" size={28} color={colors.destructive} />
      </View>
      <Text variant="h3" style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text variant="body" color={colors.textSecondary} style={styles.description}>
          {description}
        </Text>
      ) : null}
      {onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} variant="secondary" fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { textAlign: 'center' },
  description: { textAlign: 'center', marginTop: 8, maxWidth: 280 },
  action: { marginTop: 24 },
});

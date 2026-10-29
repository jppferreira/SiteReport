import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

type ErrorStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
};

export function ErrorState({
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
}: ErrorStateProps) {
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();
  const resolvedActionLabel = actionLabel ?? t('common.tryAgain');

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
      {onAction || onSecondary ? (
        <View style={styles.action}>
          {onAction ? <Button label={resolvedActionLabel} onPress={onAction} variant="secondary" fullWidth={false} /> : null}
          {onSecondary && secondaryLabel ? (
            <Button
              label={secondaryLabel}
              onPress={onSecondary}
              variant="tertiary"
              fullWidth={false}
              disabled={secondaryDisabled}
            />
          ) : null}
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
  action: { marginTop: 24, alignItems: 'center', gap: 8 },
});

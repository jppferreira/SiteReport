import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LocalImage, Text, TextButton } from '@/components';
import { useTheme } from '@/theme';

type ReportImageFieldProps = {
  label: string;
  hint?: string;
  uri: string | null;
  fallback: React.ComponentProps<typeof Image>['source'];
  busy: boolean;
  disabled?: boolean;
  onPick: () => void;
  onUseDefault: () => void;
  chooseLabel: string;
  changeLabel: string;
  savingLabel: string;
  defaultLabel: string;
  emptyLabel?: string;
};

export function ReportImageField({
  label,
  hint,
  uri,
  fallback,
  busy,
  disabled = false,
  onPick,
  onUseDefault,
  chooseLabel,
  changeLabel,
  savingLabel,
  defaultLabel,
  emptyLabel,
}: ReportImageFieldProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View>
      <Text variant="label" color={colors.textSecondary}>
        {label}
      </Text>
      {hint ? (
        <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
          {hint}
        </Text>
      ) : null}
      <Pressable
        onPress={onPick}
        disabled={busy || disabled}
        accessibilityRole="button"
        accessibilityLabel={uri ? changeLabel : chooseLabel}
        style={{ marginTop: spacing.sm, opacity: busy || disabled ? 0.6 : 1 }}
      >
        <View
          style={[
            styles.frame,
            { backgroundColor: colors.surfaceSunken, borderRadius: radius.lg, borderColor: colors.border },
          ]}
        >
          {uri ? (
            <LocalImage uri={uri} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Image source={fallback} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
          )}
        </View>
        <Text variant="bodyMedium" color={colors.accent} style={{ marginTop: spacing.sm }}>
          {busy ? savingLabel : uri ? changeLabel : chooseLabel}
        </Text>
      </Pressable>
      {uri ? (
        <TextButton label={defaultLabel} onPress={onUseDefault} disabled={busy} align="left" />
      ) : emptyLabel ? (
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
          {emptyLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 148, borderWidth: 1, overflow: 'hidden' },
});

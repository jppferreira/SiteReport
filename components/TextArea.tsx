import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

type TextAreaProps = TextInputProps & {
  label?: string;
  error?: string;
  minHeight?: number;
};

export function TextArea({ label, error, minHeight = 120, style, onFocus, onBlur, ...rest }: TextAreaProps) {
  const { colors, radius, spacing } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.destructive : focused ? colors.textPrimary : colors.border;

  return (
    <View style={styles.container}>
      {label ? (
        <Text variant="label" color={colors.textSecondary} style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        {...rest}
        multiline
        textAlignVertical="top"
        placeholderTextColor={colors.textTertiary}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        accessibilityLabel={label ?? rest.placeholder}
        style={[
          styles.input,
          {
            minHeight,
            borderColor,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            padding: spacing.md,
          },
          style,
        ]}
      />
      {error ? (
        <Text variant="caption" color={colors.destructive} style={styles.helper}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  label: { marginBottom: 6 },
  input: { fontSize: 16, lineHeight: 24, borderWidth: 1 },
  helper: { marginTop: 6 },
});

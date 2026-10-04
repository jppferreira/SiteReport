import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
};

export function Input({ label, error, required, disabled, helperText, style, onFocus, onBlur, ...rest }: InputProps) {
  const { colors, radius, spacing } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.destructive : focused ? colors.textPrimary : colors.border;

  return (
    <View style={styles.container}>
      {label ? (
        <Text variant="label" color={colors.textSecondary} style={styles.label}>
          {label}
          {required ? ' *' : ''}
        </Text>
      ) : null}
      <TextInput
        {...rest}
        editable={!disabled}
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
            borderColor,
            borderRadius: radius.md,
            backgroundColor: disabled ? colors.surfaceSunken : colors.surface,
            color: disabled ? colors.textTertiary : colors.textPrimary,
            paddingHorizontal: spacing.md,
          },
          style,
        ]}
      />
      {error ? (
        <Text variant="caption" color={colors.destructive} style={styles.helper}>
          {error}
        </Text>
      ) : helperText ? (
        <Text variant="caption" color={colors.textSecondary} style={styles.helper}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: 6,
  },
  input: {
    height: 52,
    fontSize: 16,
    borderWidth: 1,
  },
  helper: {
    marginTop: 6,
  },
});

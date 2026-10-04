import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { AppText } from './AppText';

type Props = TextInputProps & {
  label: string;
  error?: string | null;
};

export function Input({ label, error, style, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.container}>
      <AppText variant="bodySmall" color={colors.textSecondary}>
        {label}
      </AppText>
      <TextInput
        {...props}
        style={[
          styles.input,
          focused ? styles.focused : undefined,
          props.editable === false ? styles.disabled : undefined,
          error ? styles.error : undefined,
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
      />
      {error ? (
        <AppText variant="caption" color={colors.destructive}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export function TextArea({ label, error, style, ...props }: Props) {
  return (
    <Input
      label={label}
      error={error}
      multiline
      textAlignVertical="top"
      style={[styles.textArea, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  input: {
    minHeight: 48,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  textArea: {
    minHeight: 120,
    paddingTop: spacing.sm,
  },
  focused: {
    borderColor: colors.accent,
  },
  disabled: {
    opacity: 0.6,
  },
  error: {
    borderColor: colors.destructive,
  },
});

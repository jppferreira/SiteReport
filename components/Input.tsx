import React, { useState } from 'react';
import { Platform, StyleSheet, TextInput, TextInputInstance, TextInputProps, TextStyle, View } from 'react-native';

import { fontFamily, useTheme } from '@/theme';

import { Text } from './Text';
import { FLOATING_FIELD_HEIGHT, FloatingField } from './FloatingField';

/** Lexend descenders need more than a 20px line or the bottoms get clipped. */
const VALUE_LINE_HEIGHT = 24;

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
};

export const Input = React.forwardRef<TextInputInstance, InputProps>(function Input({
  label,
  error,
  required,
  disabled,
  helperText,
  style,
  onFocus,
  onBlur,
  placeholder,
  placeholderTextColor,
  value,
  ...rest
}, ref) {
  const { colors, radius, spacing } = useTheme();
  const [focused, setFocused] = useState(false);
  const filled = typeof value === 'string' ? value.length > 0 : false;
  const floated = focused || filled;
  const eyebrow = label ? `${label}${required ? ' *' : ''}` : typeof placeholder === 'string' ? placeholder : undefined;
  const showHint = Boolean(eyebrow && floated && !filled && placeholder && placeholder !== eyebrow);

  const flat = StyleSheet.flatten(style) ?? {};
  const customBackground = typeof flat.backgroundColor === 'string' ? flat.backgroundColor : undefined;
  const customText = typeof flat.color === 'string' ? flat.color : undefined;
  const customBorder = typeof flat.borderColor === 'string' ? flat.borderColor : undefined;
  const { backgroundColor: _background, borderColor: _border, borderWidth: _borderWidth, color: _color, ...inputStyle } = flat;

  const fieldBackground = customBackground ?? (disabled ? colors.surfaceSunken : colors.surface);
  const valueColor = disabled ? colors.textTertiary : (customText ?? colors.textPrimary);
  const borderColor = error ? colors.destructive : (customBorder ?? (focused ? colors.textPrimary : colors.border));
  const restingColor = error
    ? colors.destructive
    : typeof placeholderTextColor === 'string'
      ? placeholderTextColor
      : colors.textTertiary;
  const floatedColor = error ? colors.destructive : (customText ?? (focused ? colors.textPrimary : colors.textSecondary));

  return (
    <View style={styles.container}>
      <FloatingField
        eyebrow={eyebrow}
        floated={Boolean(eyebrow) && floated}
        restingColor={restingColor}
        floatedColor={floatedColor}
        borderColor={borderColor}
        backgroundColor={fieldBackground}
        radius={radius.md}
        restOffset={(FLOATING_FIELD_HEIGHT - VALUE_LINE_HEIGHT) / 2}
        restLineHeight={VALUE_LINE_HEIGHT}
      >
        <TextInput
          {...rest}
          ref={ref}
          value={value}
          placeholder={showHint ? placeholder : undefined}
          editable={!disabled}
          placeholderTextColor={colors.textTertiary}
          underlineColorAndroid="transparent"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          hitSlop={{ top: 12 }}
          accessibilityLabel={eyebrow ?? (typeof placeholder === 'string' ? placeholder : undefined)}
          style={[
            styles.input,
            inputStyle as TextStyle,
            {
              color: valueColor,
              paddingHorizontal: spacing.md,
            },
            Platform.OS === 'web' ? webOutline : null,
          ]}
        />
      </FloatingField>
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
});

const webOutline = { outlineWidth: 0, outlineColor: 'transparent' } as TextStyle;

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    height: '100%',
    fontSize: 16,
    lineHeight: VALUE_LINE_HEIGHT,
    fontFamily: fontFamily.regular,
    paddingVertical: 0,
    textAlignVertical: 'center',
    backgroundColor: 'transparent',
  },
  helper: {
    marginTop: 6,
  },
});

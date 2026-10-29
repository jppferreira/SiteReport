import React, { useState } from 'react';
import { Platform, StyleSheet, TextInput, TextInputProps, TextStyle, View } from 'react-native';

import { fontFamily, useTheme } from '@/theme';

import { Text } from './Text';
import { FloatingField } from './FloatingField';

type TextAreaProps = TextInputProps & {
  label?: string;
  error?: string;
  minHeight?: number;
};

const REST_INSET = 16;

export function TextArea({
  label,
  error,
  minHeight = 120,
  style,
  onFocus,
  onBlur,
  placeholder,
  placeholderTextColor,
  value,
  ...rest
}: TextAreaProps) {
  const { colors, radius, spacing } = useTheme();
  const [focused, setFocused] = useState(false);
  const filled = typeof value === 'string' ? value.length > 0 : false;
  const floated = focused || filled;
  const eyebrow = label ?? (typeof placeholder === 'string' ? placeholder : undefined);
  const showHint = Boolean(eyebrow && floated && !filled && placeholder && placeholder !== eyebrow);

  const flat = StyleSheet.flatten(style) ?? {};
  const customBackground = typeof flat.backgroundColor === 'string' ? flat.backgroundColor : undefined;
  const customText = typeof flat.color === 'string' ? flat.color : undefined;
  const customBorder = typeof flat.borderColor === 'string' ? flat.borderColor : undefined;
  const { backgroundColor: _background, borderColor: _border, borderWidth: _borderWidth, color: _color, ...inputStyle } = flat;

  const fieldBackground = customBackground ?? colors.surface;
  const valueColor = customText ?? colors.textPrimary;
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
        restOffset={REST_INSET}
        restLineHeight={24}
        minHeight={minHeight}
      >
        <TextInput
          {...rest}
          value={value}
          placeholder={showHint ? placeholder : undefined}
          multiline
          textAlignVertical="top"
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
          accessibilityLabel={eyebrow}
          style={[
            styles.input,
            inputStyle as TextStyle,
            {
              minHeight,
              color: valueColor,
              paddingHorizontal: spacing.md,
              paddingBottom: spacing.md,
              paddingTop: eyebrow && floated ? 20 : REST_INSET,
            },
            Platform.OS === 'web' ? webOutline : null,
          ]}
        />
      </FloatingField>
      {error ? (
        <Text variant="caption" color={colors.destructive} style={styles.helper}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const webOutline = { outlineWidth: 0, outlineColor: 'transparent' } as TextStyle;

const styles = StyleSheet.create({
  container: { width: '100%' },
  input: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fontFamily.regular,
    backgroundColor: 'transparent',
  },
  helper: { marginTop: 6 },
});

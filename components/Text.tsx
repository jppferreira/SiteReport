import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

import { TypographyVariant, useTheme } from '@/theme';

type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: string;
};

/** Themed text primitive. Prefer this over raw RN `Text` for anything user-facing. */
export function Text({ variant = 'body', color, style, ...rest }: TextProps) {
  const { typography, colors } = useTheme();
  return (
    <RNText
      style={[typography[variant], { color: color ?? colors.textPrimary }, style]}
      {...rest}
    />
  );
}

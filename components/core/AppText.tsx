import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { colors, typography } from '@/theme';

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption' | 'button';

type Props = TextProps & {
  variant?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
};

export function AppText({ variant = 'body', color = colors.textPrimary, style, ...props }: Props) {
  return <Text allowFontScaling style={[baseStyle[variant], { color }, style]} {...props} />;
}

const baseStyle: Record<Variant, TextStyle> = {
  display: typography.display,
  h1: typography.h1,
  h2: typography.h2,
  h3: typography.h3,
  body: typography.body,
  bodySmall: typography.bodySmall,
  caption: typography.caption,
  button: typography.button,
};

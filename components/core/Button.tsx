import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'destructive';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, style }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: Boolean(loading) }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && !isDisabled ? styles.pressed : undefined,
        isDisabled ? styles.disabled : undefined,
        style,
      ]}>
      <View style={styles.row}>
        {loading ? <ActivityIndicator size="small" color={indicatorColor[variant]} /> : null}
        <AppText variant="button" color={textColor[variant]}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});

const variantStyles: Record<Variant, ViewStyle> = {
  primary: {
    backgroundColor: colors.cta,
    borderColor: colors.cta,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  tertiary: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  destructive: {
    backgroundColor: colors.destructive,
    borderColor: colors.destructive,
  },
};

const textColor: Record<Variant, string> = {
  primary: '#FFFFFF',
  secondary: colors.textPrimary,
  tertiary: colors.textPrimary,
  destructive: '#FFFFFF',
};

const indicatorColor: Record<Variant, string> = {
  primary: '#FFFFFF',
  secondary: colors.textPrimary,
  tertiary: colors.textPrimary,
  destructive: '#FFFFFF',
};

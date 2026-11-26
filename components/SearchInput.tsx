import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, Pressable, StyleSheet, TextInput, TextStyle, View } from 'react-native';

import { useI18n } from '@/i18n/useI18n';
import { fontFamily, useTheme } from '@/theme';

type SearchInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** `compact` — 44px white bordered field (Jobs home Figma). Default keeps the taller sunken field. */
  variant?: 'default' | 'compact';
  autoFocus?: boolean;
  style?: object;
};

export function SearchInput({
  value,
  onChangeText,
  placeholder,
  variant = 'default',
  autoFocus = false,
  style,
}: SearchInputProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t('jobs.searchPlaceholder');
  const compact = variant === 'compact';

  return (
    <View
      style={[
        styles.container,
        compact ? styles.compact : null,
        {
          backgroundColor: compact ? colors.surface : colors.surfaceSunken,
          borderRadius: compact ? radius.pill : radius.xl,
          paddingHorizontal: compact ? 14 : spacing.md,
          borderWidth: compact ? 1 : 0,
          borderColor: compact ? colors.border : 'transparent',
          width: compact ? undefined : '100%',
          flex: compact ? 1 : undefined,
        },
        style,
      ]}
    >
      <Ionicons name="search" size={compact ? 20 : 22} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={resolvedPlaceholder}
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={resolvedPlaceholder}
        returnKeyType="search"
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        blurOnSubmit={false}
        style={[
          styles.input,
          compact ? styles.inputCompact : null,
          { color: colors.textPrimary },
          Platform.OS === 'web' ? webOutline : null,
        ]}
      />
      {/* Always reserve the clear slot so the first character doesn’t shift layout under the focused input. */}
      <View style={[styles.clearSlot, compact ? styles.clearSlotCompact : null]}>
        {value.length > 0 ? (
          <Pressable
            onPress={() => onChangeText('')}
            accessibilityRole="button"
            accessibilityLabel={t('components.searchClear')}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={compact ? 18 : 22} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    gap: 10,
  },
  compact: {
    height: 44,
    gap: 8,
    minWidth: 0,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontFamily: fontFamily.regular,
    height: '100%',
    paddingVertical: 0,
  },
  inputCompact: {
    fontSize: 14.5,
  },
  clearSlot: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSlotCompact: {
    width: 18,
    height: 18,
  },
});

const webOutline = { outlineWidth: 0, outlineColor: 'transparent' } as TextStyle;

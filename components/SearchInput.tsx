import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, Pressable, StyleSheet, TextInput, TextStyle, View } from 'react-native';

import { useI18n } from '@/i18n/useI18n';
import { fontFamily, useTheme } from '@/theme';

type SearchInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export function SearchInput({ value, onChangeText, placeholder }: SearchInputProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t('jobs.searchPlaceholder');

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSunken,
          borderRadius: radius.xl,
          paddingHorizontal: spacing.md,
          width: '100%',
        },
      ]}
    >
      <Ionicons name="search" size={22} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={resolvedPlaceholder}
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={resolvedPlaceholder}
        returnKeyType="search"
        style={[styles.input, { color: colors.textPrimary }, Platform.OS === 'web' ? webOutline : null]}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel={t('components.searchClear')}
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
        </Pressable>
      ) : null}
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
  input: {
    flex: 1,
    fontSize: 17,
    fontFamily: fontFamily.regular,
    height: '100%',
    paddingVertical: 0,
  },
});

const webOutline = { outlineWidth: 0, outlineColor: 'transparent' } as TextStyle;

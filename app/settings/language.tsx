import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { NavigationHeader, Screen, Text } from '@/components';
import { LOCALE_LABELS, SUPPORTED_LOCALES, type AppLocale } from '@/i18n';
import { saveStoredLocale } from '@/i18n/localePreference';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

export default function LanguageSettingsScreen() {
  const { colors, radius, spacing } = useTheme();
  const { t, locale, setLocale } = useI18n();

  const selectLocale = async (next: AppLocale) => {
    setLocale(next);
    await saveStoredLocale(next);
  };

  return (
    <Screen>
      <NavigationHeader title={t('language.title')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text variant="body" color={colors.textSecondary} style={{ marginBottom: spacing.lg }}>
          {t('language.description')}
        </Text>
        <View
          style={[
            styles.list,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              borderColor: colors.border,
            },
          ]}
        >
          {SUPPORTED_LOCALES.map((option, index) => {
            const selected = option === locale;
            return (
              <Pressable
                key={option}
                onPress={() => void selectLocale(option)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={LOCALE_LABELS[option]}
                style={[
                  styles.row,
                  {
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                    borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                  },
                ]}
              >
                <Text variant="body" style={{ flex: 1 }}>
                  {LOCALE_LABELS[option]}
                </Text>
                {selected ? (
                  <Ionicons name="checkmark" size={22} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
});

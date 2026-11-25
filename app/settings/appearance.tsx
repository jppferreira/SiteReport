import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { NavigationHeader, Screen, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import type { AppearancePreference } from '@/services/preferencesService';
import { useTheme } from '@/theme';

const OPTIONS: AppearancePreference[] = ['system', 'light', 'dark'];

export default function AppearanceSettingsScreen() {
  const { colors, radius, spacing, appearance, setAppearance } = useTheme();
  const { t } = useI18n();

  const labelFor = (option: AppearancePreference) => {
    if (option === 'system') return t('appearance.system');
    if (option === 'light') return t('appearance.light');
    return t('appearance.dark');
  };

  return (
    <Screen>
      <NavigationHeader title={t('appearance.title')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text variant="body" color={colors.textSecondary} style={{ marginBottom: spacing.lg }}>
          {t('appearance.description')}
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
          {OPTIONS.map((option, index) => {
            const selected = option === appearance;
            return (
              <Pressable
                key={option}
                onPress={() => void setAppearance(option)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={labelFor(option)}
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
                  {labelFor(option)}
                </Text>
                {selected ? <Ionicons name="checkmark" size={22} color={colors.accent} /> : null}
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

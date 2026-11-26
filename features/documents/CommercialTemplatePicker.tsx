import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import {
  COMMERCIAL_TEMPLATES,
  type CommercialTemplateId,
} from '@/models';
import { useTheme } from '@/theme';

type CommercialTemplatePickerProps = {
  value: CommercialTemplateId;
  onChange: (id: CommercialTemplateId) => void;
  /** Accent used for the active chip border. */
  accentColor?: string;
};

/** Compact Classic / Bold / Minimal chips for quote & invoice preview. */
export function CommercialTemplatePicker({
  value,
  onChange,
  accentColor,
}: CommercialTemplatePickerProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const activeBorder = accentColor ?? colors.accent;

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="caption" color={colors.textSecondary} style={styles.label}>
        {t('preview.commercialTemplateLabel')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}
      >
        {COMMERCIAL_TEMPLATES.map((option) => {
          const active = option.id === value;
          const label = t(`preview.commercialTemplate.${option.id}.label`);
          const description = t(`preview.commercialTemplate.${option.id}.description`);
          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(option.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t('preview.commercialTemplateA11y', {
                label,
                description,
              })}
              style={[
                styles.chip,
                {
                  borderRadius: radius.pill,
                  borderColor: active ? activeBorder : colors.border,
                  backgroundColor: active ? colors.surface : colors.background,
                  borderWidth: active ? 2 : 1.5,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                },
              ]}
            >
              <Text variant="bodyMedium" color={colors.textPrimary} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  chip: {
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

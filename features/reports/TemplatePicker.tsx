import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n/useI18n';

import { StatusBadge, Text } from '@/components';
import { isFreeReportTemplate, ReportTemplateId } from '@/models';
import { REPORT_TEMPLATES } from '@/services/pdfService';
import { useTheme } from '@/theme';

import { LayoutThumb } from './LayoutThumb';

type TemplatePickerProps = {
  value: ReportTemplateId;
  onChange: (id: ReportTemplateId) => void;
  accentColor?: string;
  /** Layout already saved. Shown on its card while another layout is only being previewed. */
  savedId?: ReportTemplateId;
  /** Shorter cards, so the page preview underneath can use the height. */
  compact?: boolean;
  /** The selected layout's description. Off when the report preview already shows it. */
  showDescription?: boolean;
  /** When false, layouts outside the free set stay visible and open the upgrade screen. */
  isPro?: boolean;
  onLocked?: () => void;
};

export function TemplatePicker({
  value,
  onChange,
  accentColor = '#1FA84A',
  savedId,
  compact = false,
  showDescription = true,
  isPro = true,
  onLocked,
}: TemplatePickerProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const selected = REPORT_TEMPLATES.find((option) => option.id === value) ?? REPORT_TEMPLATES[0]!;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: compact ? spacing.xs : spacing.sm, paddingVertical: 2 }}
      >
        {REPORT_TEMPLATES.map((option) => {
          const active = option.id === value;
          const locked = !isPro && !isFreeReportTemplate(option.id);
          return (
            <Pressable
              key={option.id}
              onPress={() => {
                if (locked) {
                  onLocked?.();
                  return;
                }
                onChange(option.id);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={
                locked
                  ? t('reports.templatePickerA11yLocked', {
                      label: option.label,
                      description: option.description,
                    })
                  : t('reports.templatePickerA11y', {
                      label: option.label,
                      description: option.description,
                    })
              }
              style={[
                styles.card,
                compact ? styles.cardCompact : null,
                {
                  borderRadius: radius.md,
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              {locked ? (
                <View style={styles.badge}>
                  <StatusBadge label={t('reports.templatePickerProBadge')} tone="accent" />
                </View>
              ) : null}
              <LayoutThumb template={option.id} accent={accentColor} />
              <Text
                variant={compact ? 'caption' : 'bodyMedium'}
                color={colors.textPrimary}
                numberOfLines={1}
                style={{ marginTop: compact ? 4 : spacing.xs }}
              >
                {option.label}
              </Text>
              {compact ? null : (
                <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
                  {option.hint}
                </Text>
              )}
              {savedId ? (
                <Text
                  variant="caption"
                  color={savedId === option.id ? colors.accent : 'transparent'}
                  style={{ marginTop: 2 }}
                  accessibilityElementsHidden={savedId !== option.id}
                >
                  {t('reports.templatePickerInUse')}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {showDescription ? (
        <Text
          variant="caption"
          color={colors.textSecondary}
          numberOfLines={compact ? 1 : undefined}
          style={{ marginTop: compact ? spacing.xs : spacing.sm }}
        >
          {selected.description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 148,
    borderWidth: 1.5,
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 1,
  },
  cardCompact: {
    width: 108,
    padding: 6,
  },
});

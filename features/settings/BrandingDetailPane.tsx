import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, StatusBadge, Text, TextButton } from '@/components';
import { HtmlReportPreview } from '@/features/reports/HtmlReportPreview';
import { buildLayoutExampleHtml } from '@/features/reports/sampleReport';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useEntitlement } from '@/hooks/useEntitlement';
import { DEFAULT_REPORT_TEMPLATE } from '@/models';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { DEFAULT_ACCENT, parseAccentHex } from '@/utils/accentColor';

/**
 * Simplified branding detail pane for iPad Settings split view.
 * Shows key branding info and a live preview on the right.
 */
export function BrandingDetailPane() {
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();
  const { profile } = useBusinessProfile();
  const { isPro } = useEntitlement();

  const accentColor = parseAccentHex(profile?.accentColor ?? '') ?? DEFAULT_ACCENT;
  
  const html = buildLayoutExampleHtml(DEFAULT_REPORT_TEMPLATE, {
    businessName: profile?.businessName ?? '',
    footerMessage: profile?.footerMessage ?? '',
    accentColor,
  });

  return (
    <View style={[styles.container, { flexDirection: 'row', backgroundColor: colors.background }]}>
      {/* Left: Form/Settings */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <View>
          <Text variant="h2" style={{ marginBottom: spacing.sm }}>
            {t('settings.brandingAndLayout')}
          </Text>
          <Text variant="body" color={colors.textSecondary}>
            {t('branding.subtitle')}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              padding: spacing.md,
              gap: spacing.sm,
            },
          ]}
        >
          <View style={styles.row}>
            <Text variant="label" color={colors.textSecondary}>
              {t('branding.businessName')}
            </Text>
            <Text variant="bodyMedium">{profile?.businessName || t('settings.noBusinessName')}</Text>
          </View>

          <View style={styles.row}>
            <Text variant="label" color={colors.textSecondary}>
              {t('branding.accentColour')}
            </Text>
            <View style={styles.colorPreview}>
              <View
                style={[
                  styles.colorSwatch,
                  {
                    backgroundColor: accentColor,
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
              />
              <Text variant="caption" color={colors.textSecondary}>
                {accentColor.toUpperCase()}
              </Text>
            </View>
          </View>

          {profile?.footerMessage ? (
            <View style={styles.row}>
              <Text variant="label" color={colors.textSecondary}>
                {t('branding.footerMessage')}
              </Text>
              <Text variant="body" numberOfLines={2}>
                {profile.footerMessage}
              </Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <Text variant="label" color={colors.textSecondary}>
              {t('branding.logoOnReports')}
            </Text>
            <StatusBadge
              label={isPro ? t('branding.enabledBadge') : t('branding.proBadge')}
              tone={isPro ? 'success' : 'accent'}
            />
          </View>
        </View>

        <Button
          label={t('settings.openFullEditor')}
          variant="accent"
          onPress={() => router.push('/settings/branding')}
        />

        <Pressable onPress={() => router.push('/settings/business-profile')}>
          <Text variant="caption" color={colors.accent} style={{ textAlign: 'center' }}>
            {t('settings.editBusinessProfile')}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Right: Live Preview */}
      <View
        style={[
          styles.preview,
          {
            borderLeftWidth: StyleSheet.hairlineWidth,
            borderLeftColor: colors.border,
            backgroundColor: colors.surfaceSunken,
          },
        ]}
      >
        <HtmlReportPreview html={html} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
  },
  row: {
    gap: 4,
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorSwatch: {
    width: 24,
    height: 24,
  },
  preview: {
    width: 320,
    flexShrink: 0,
  },
});

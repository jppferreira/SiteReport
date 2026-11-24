import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { BottomSheet, Button, Input, SegmentedControl, Text, TextButton } from '@/components';
import {
  displayReviewUrl,
  REVIEW_PROVIDER_LABELS,
  ReviewProvider,
} from '@/models';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

type ReviewLinkSettingProps = {
  enabled: boolean;
  url: string | null;
  provider: ReviewProvider;
  isPro: boolean;
  onToggle: (enabled: boolean) => void;
  onLocked: () => void;
  onSave: (next: { url: string | null; provider: ReviewProvider }) => void;
};

export function ReviewLinkSetting({
  enabled,
  url,
  provider,
  isPro,
  onToggle,
  onLocked,
  onSave,
}: ReviewLinkSettingProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftUrl, setDraftUrl] = useState(url ?? '');
  const [draftProvider, setDraftProvider] = useState<ReviewProvider>(provider);

  const openChange = () => {
    if (!isPro) {
      onLocked();
      return;
    }
    setDraftUrl(url ?? '');
    setDraftProvider(provider);
    setSheetOpen(true);
  };

  const handleToggle = (value: boolean) => {
    if (!isPro) {
      onLocked();
      return;
    }
    onToggle(value);
  };

  const save = () => {
    const trimmed = draftUrl.trim();
    onSave({ url: trimmed.length > 0 ? trimmed : null, provider: draftProvider });
    setSheetOpen(false);
  };

  const providerIcon =
    provider === 'checkatrade' ? 'checkmark-circle' : provider === 'custom' ? 'link' : 'logo-google';

  return (
    <>
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accentSoft,
            }}
          >
            <Ionicons name="star" size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" color={colors.textPrimary}>
              {t('preview.reviewInclude')}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {t('preview.reviewIncludeHint')}
            </Text>
          </View>
          <Switch
            value={enabled && isPro}
            onValueChange={handleToggle}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.surface}
          />
        </View>

        <View style={{ height: 1, backgroundColor: colors.border }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name={providerIcon} size={18} color={colors.textPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" color={colors.textPrimary}>
              {REVIEW_PROVIDER_LABELS[provider]}
            </Text>
            <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {url ? displayReviewUrl(url) : t('preview.reviewUrlEmpty')}
            </Text>
          </View>
          <Pressable
            onPress={openChange}
            accessibilityRole="button"
            style={({ pressed }) => ({
              backgroundColor: colors.accentSoft,
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 999,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text variant="caption" color={colors.accent} style={{ fontWeight: '700' }}>
              {t('preview.reviewChange')}
            </Text>
          </Pressable>
        </View>
      </View>

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <Text variant="h3" style={{ marginBottom: spacing.xs }}>
          {t('preview.reviewSheetTitle')}
        </Text>
        <Text variant="body" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
          {t('preview.reviewSheetBody')}
        </Text>
        <SegmentedControl
          segments={[
            { key: 'google', label: t('preview.reviewProviderGoogle') },
            { key: 'checkatrade', label: t('preview.reviewProviderCheckatrade') },
            { key: 'custom', label: t('preview.reviewProviderCustom') },
          ]}
          value={draftProvider}
          onChange={(key) => setDraftProvider(key as ReviewProvider)}
        />
        <View style={{ height: spacing.md }} />
        <Input
          label={t('preview.reviewUrlLabel')}
          value={draftUrl}
          onChangeText={setDraftUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder={t('preview.reviewUrlPlaceholder')}
        />
        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <Button label={t('common.save')} onPress={save} />
          <TextButton label={t('common.cancel')} onPress={() => setSheetOpen(false)} />
        </View>
      </BottomSheet>
    </>
  );
}

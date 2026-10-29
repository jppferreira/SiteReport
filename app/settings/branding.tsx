import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInputInstance, View } from 'react-native';

import { Button, Input, NavigationHeader, PermissionNotice, Screen, StatusBadge, Text, TextButton } from '@/components';
import { CoverDesignPicker } from '@/features/branding/CoverDesignPicker';
import { CustomColorInput } from '@/features/branding/CustomColorInput';
import { ImageMaskPicker } from '@/features/branding/ImageMaskPicker';
import { ReportImageField } from '@/features/branding/ReportImageField';
import { HtmlReportPreview } from '@/features/reports/HtmlReportPreview';
import { buildLayoutExampleHtml } from '@/features/reports/sampleReport';
import { TemplatePicker } from '@/features/reports/TemplatePicker';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useEntitlement } from '@/hooks/useEntitlement';
import {
  CoverDesignId,
  DEFAULT_COVER_DESIGN,
  DEFAULT_REPORT_IMAGE_MASK,
  DEFAULT_REPORT_TEMPLATE,
  isFreeReportTemplate,
  normalizeReportImageMask,
  ReportImageMask,
  ReportTemplateId,
  templateAllowedForTier,
} from '@/models';
import { hasProAccess } from '@/services/entitlementService';
import { deleteFileSafely, ensureBusinessDirectory } from '@/services/fileService';
import { processReportCover } from '@/services/imageService';
import { imageFileToDataUri, reportTemplateLabel } from '@/services/pdfService';
import { requestPhotoLibraryAccess } from '@/services/photoLibraryAccess';
import { getPreferences, savePreferences } from '@/services/preferencesService';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
  accentSwatchInk,
  customAccentError,
  isPresetAccent,
  parseAccentHex,
} from '@/utils/accentColor';

const DEFAULT_COVER = require('../../assets/images/report-cover.jpg');
const DEFAULT_THANKS = require('../../assets/images/report-thanks.jpg');

export default function BrandingScreen() {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const { profile, loading, save } = useBusinessProfile();
  const { isPro } = useEntitlement();

  const [footerMessage, setFooterMessage] = useState('');
  const [accentOverride, setAccentOverride] = useState<string | null>(null);
  const [draftOverride, setDraftOverride] = useState<string | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  const [savedLayout, setSavedLayout] = useState<ReportTemplateId>(DEFAULT_REPORT_TEMPLATE);
  const [previewLayout, setPreviewLayout] = useState<ReportTemplateId>(DEFAULT_REPORT_TEMPLATE);
  const [coverDataUri, setCoverDataUri] = useState<string | null>(null);
  const [thanksDataUri, setThanksDataUri] = useState<string | null>(null);
  const [picking, setPicking] = useState<'cover' | 'thanks' | null>(null);
  const [maskOverride, setMaskOverride] = useState<ReportImageMask | null>(null);
  const [coverDesign, setCoverDesign] = useState<CoverDesignId>(DEFAULT_COVER_DESIGN);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customFieldRef = useRef<TextInputInstance>(null);
  const pendingAccent = useRef<string | null>(null);
  const savedAccent = useRef<string | null>(null);
  const accentReady = useRef(false);

  const storedAccent = parseAccentHex(profile?.accentColor ?? '') ?? DEFAULT_ACCENT;
  const accentColor = accentOverride ?? storedAccent;
  const storedCustom = (() => {
    const parsed = parseAccentHex(profile?.accentColor ?? '');
    return parsed && !isPresetAccent(parsed) ? parsed : '';
  })();
  const customDraft = draftOverride ?? storedCustom;

  const flushPendingAccent = useCallback(() => {
    const pending = pendingAccent.current;
    if (!pending) return;
    pendingAccent.current = null;
    if (accentTimer.current) {
      clearTimeout(accentTimer.current);
      accentTimer.current = null;
    }
    savedAccent.current = pending;
    void save({ accentColor: pending });
  }, [save]);

  useEffect(() => () => flushPendingAccent(), [flushPendingAccent]);

  useEffect(() => {
    if (!profile) return;
    if (!hydrated.current) {
      setFooterMessage(profile.footerMessage ?? '');
      hydrated.current = true;
    }
    if (!accentReady.current) {
      accentReady.current = true;
      savedAccent.current = parseAccentHex(profile.accentColor ?? '');
    }
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPreferences(), hasProAccess()]).then(([preferences, pro]) => {
      if (cancelled) return;
      const allowed = templateAllowedForTier(preferences.reportTemplate, pro);
      setSavedLayout(allowed);
      setPreviewLayout(allowed);
      setCoverDesign(preferences.coverDesign);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const coverImageUri = profile?.coverImageUri ?? null;
  const thanksImageUri = profile?.thanksImageUri ?? null;
  const imageMask = maskOverride ?? normalizeReportImageMask(profile?.imageMask ?? DEFAULT_REPORT_IMAGE_MASK);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [cover, thanks] = await Promise.all([
        coverImageUri ? imageFileToDataUri(coverImageUri) : Promise.resolve(null),
        thanksImageUri ? imageFileToDataUri(thanksImageUri) : Promise.resolve(null),
      ]);
      if (!active) return;
      setCoverDataUri(cover);
      setThanksDataUri(thanks);
    };
    void load();
    return () => {
      active = false;
    };
  }, [coverImageUri, thanksImageUri]);

  useEffect(() => {
    if (!hydrated.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      save({ footerMessage });
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [footerMessage, save]);

  const reportAccent = isPro ? accentColor : DEFAULT_ACCENT;

  const exampleHtml = useMemo(
    () =>
      buildLayoutExampleHtml(previewLayout, {
        businessName: profile?.businessName,
        accentColor: reportAccent,
        footerMessage,
        phone: profile?.phone,
        email: profile?.email,
        coverImageDataUri: coverDataUri,
        thanksImageDataUri: thanksDataUri,
        imageMask,
        coverDesign,
      }),
    [
      previewLayout,
      profile?.businessName,
      profile?.phone,
      profile?.email,
      reportAccent,
      footerMessage,
      coverDataUri,
      thanksDataUri,
      imageMask,
      coverDesign,
    ]
  );

  const previewingNewLayout = previewLayout !== savedLayout;
  const customSelected = isPro && !isPresetAccent(accentColor);

  const chooseLayout = (id: ReportTemplateId) => {
    if (!isPro && !isFreeReportTemplate(id)) {
      router.push({ pathname: '/paywall', params: { trigger: 'template' } });
      return;
    }
    setPreviewLayout(id);
  };

  const handleUseLayout = () => {
    if (!isPro && !isFreeReportTemplate(previewLayout)) {
      router.push({ pathname: '/paywall', params: { trigger: 'template' } });
      return;
    }
    setSavedLayout(previewLayout);
    void savePreferences({ reportTemplate: previewLayout });
  };

  const handlePickImage = async (slot: 'cover' | 'thanks') => {
    const allowed = await requestPhotoLibraryAccess();
    if (!allowed) {
      setPermissionDenied(true);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || result.assets.length === 0) return;

    setPicking(slot);
    try {
      const asset = result.assets[0]!;
      const previous = slot === 'cover' ? coverImageUri : thanksImageUri;
      const dir = await ensureBusinessDirectory();
      const destination = `${dir}${slot}-${Date.now()}.jpg`;
      const saved = await processReportCover(asset.uri, destination, asset.width, asset.height);
      if (slot === 'cover') await save({ coverImageUri: saved });
      else await save({ thanksImageUri: saved });
      if (previous && previous !== saved) await deleteFileSafely(previous);
    } finally {
      setPicking(null);
    }
  };

  const handleUseDefaultImage = async (slot: 'cover' | 'thanks') => {
    const previous = slot === 'cover' ? coverImageUri : thanksImageUri;
    if (!previous) return;
    if (slot === 'cover') await save({ coverImageUri: null });
    else await save({ thanksImageUri: null });
    await deleteFileSafely(previous);
  };

  const handleMask = (mask: ReportImageMask) => {
    setMaskOverride(mask);
    void save({ imageMask: mask });
  };

  const handleCoverDesign = (design: CoverDesignId) => {
    setCoverDesign(design);
    void savePreferences({ coverDesign: design });
  };

  const openPaywall = () => {
    router.push({ pathname: '/paywall', params: { trigger: 'colour' } });
  };

  const applyAccent = (color: string, persist: 'now' | 'soon') => {
    if (!isPro) {
      openPaywall();
      return;
    }
    const parsed = parseAccentHex(color);
    if (!parsed) return;
    setAccentOverride(parsed);
    setDraftOverride(isPresetAccent(parsed) ? '' : parsed);
    setCustomError(null);
    if (parsed === savedAccent.current) {
      pendingAccent.current = null;
      if (accentTimer.current) {
        clearTimeout(accentTimer.current);
        accentTimer.current = null;
      }
      return;
    }
    if (persist === 'now') {
      pendingAccent.current = null;
      if (accentTimer.current) {
        clearTimeout(accentTimer.current);
        accentTimer.current = null;
      }
      savedAccent.current = parsed;
      void save({ accentColor: parsed });
      return;
    }
    pendingAccent.current = parsed;
    if (accentTimer.current) clearTimeout(accentTimer.current);
    accentTimer.current = setTimeout(() => {
      accentTimer.current = null;
      pendingAccent.current = null;
      savedAccent.current = parsed;
      void save({ accentColor: parsed });
    }, 300);
  };

  const handleCustomText = (value: string) => {
    if (!isPro) {
      openPaywall();
      return;
    }
    const parsed = parseAccentHex(value);
    if (parsed) {
      applyAccent(parsed, 'now');
      return;
    }
    setDraftOverride(value);
    setCustomError(customAccentError(value, false));
  };

  const handleCustomBlur = () => {
    setCustomError(customAccentError(customDraft, true));
    if (!customDraft.trim() && !isPresetAccent(accentColor)) {
      setDraftOverride(accentColor);
    }
  };

  if (loading) return null;

  return (
    <Screen>
      <NavigationHeader
        title={t('branding.title')}
        onBack={() => router.back()}
        right={<TextButton label={t('branding.done')} onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xl }}>
        <View>
          <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
            {t('branding.photoEdge')}
          </Text>
          <ImageMaskPicker value={imageMask} onChange={handleMask} />
        </View>

        <View
          style={[
            styles.example,
            { borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.lg },
          ]}
        >
          <HtmlReportPreview html={exampleHtml} />
        </View>

        <View>
          <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
            {t('branding.coverDesign')}
          </Text>
          <CoverDesignPicker value={coverDesign} onChange={handleCoverDesign} accentColor={reportAccent} />
        </View>

        <View>
          <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
            {t('branding.reportLayout')}
          </Text>
          <TemplatePicker
            compact
            showDescription={false}
            value={previewLayout}
            savedId={savedLayout}
            onChange={chooseLayout}
            accentColor={reportAccent}
            isPro={isPro}
            onLocked={() => router.push({ pathname: '/paywall', params: { trigger: 'template' } })}
          />
          {previewingNewLayout ? (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Button label={t('branding.useLayout', { layout: reportTemplateLabel(previewLayout) })} onPress={handleUseLayout} />
            </View>
          ) : null}
        </View>

        <ReportImageField
          label={t('branding.coverImage')}
          uri={coverImageUri}
          fallback={DEFAULT_COVER}
          busy={picking === 'cover'}
          disabled={picking !== null}
          onPick={() => void handlePickImage('cover')}
          onUseDefault={() => void handleUseDefaultImage('cover')}
          chooseLabel={t('branding.chooseCover')}
          changeLabel={t('branding.changeCover')}
          savingLabel={t('branding.savingCover')}
          defaultLabel={t('branding.defaultCover')}
        />

        <ReportImageField
          label={t('branding.thankYouImage')}
          uri={thanksImageUri}
          fallback={DEFAULT_THANKS}
          busy={picking === 'thanks'}
          disabled={picking !== null}
          onPick={() => void handlePickImage('thanks')}
          onUseDefault={() => void handleUseDefaultImage('thanks')}
          chooseLabel={t('branding.chooseThankYou')}
          changeLabel={t('branding.changeThankYou')}
          savingLabel={t('branding.savingThankYou')}
          defaultLabel={t('branding.defaultThankYou')}
        />

        <View>
          <View style={styles.labelRow}>
            <Text variant="label" color={colors.textSecondary}>
              {t('branding.accentColour')}
            </Text>
            {!isPro ? <StatusBadge label={t('branding.proBadge')} tone="accent" /> : null}
          </View>
          <View style={[styles.swatchRow, { marginTop: spacing.sm, gap: spacing.sm }]}>
            {ACCENT_PRESETS.map((color) => {
              const selected = isPro && color === accentColor;
              return (
                <Pressable
                  key={color}
                  onPress={() => applyAccent(color, 'now')}
                  accessibilityRole="button"
                  accessibilityLabel={t('branding.accentSwatchA11y', { color: color })}
                  accessibilityState={{ selected }}
                  style={[
                    styles.swatch,
                    { backgroundColor: color, borderRadius: radius.pill, borderWidth: selected ? 3 : 0, borderColor: colors.textPrimary },
                  ]}
                >
                  {selected ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                </Pressable>
              );
            })}
            <View style={styles.customSlot}>
              <Pressable
                onPress={() => {
                  if (!isPro) {
                    openPaywall();
                    return;
                  }
                  customFieldRef.current?.focus();
                }}
                accessibilityRole="button"
                accessibilityLabel={customSelected ? t('branding.customAccentNamedA11y', { color: accentColor }) : t('branding.customAccentA11y')}
                accessibilityState={{ selected: customSelected }}
                accessible={!(Platform.OS === 'web' && isPro)}
                pointerEvents={Platform.OS === 'web' && isPro ? 'none' : 'auto'}
                style={[
                  styles.swatch,
                  customSelected
                    ? {
                        backgroundColor: accentColor,
                        borderRadius: radius.pill,
                        borderWidth: 3,
                        borderColor: colors.textPrimary,
                      }
                    : {
                        backgroundColor: colors.surfaceSunken,
                        borderRadius: radius.pill,
                        borderWidth: 1,
                        borderColor: colors.borderStrong,
                      },
                ]}
              >
                {customSelected ? (
                  <Ionicons name="checkmark" size={16} color={accentSwatchInk(accentColor)} />
                ) : (
                  <Ionicons name="color-palette-outline" size={18} color={colors.textSecondary} />
                )}
              </Pressable>
              {isPro ? (
                <CustomColorInput
                  value={accentColor}
                  onChange={(hex) => applyAccent(hex, 'soon')}
                  onCommit={flushPendingAccent}
                />
              ) : null}
            </View>
          </View>
          <View style={{ marginTop: spacing.md, position: 'relative' }}>
            <Input
              ref={customFieldRef}
              label={t('branding.customColour')}
              placeholder={t('branding.customColourPlaceholder')}
              value={customDraft}
              onChangeText={handleCustomText}
              onBlur={handleCustomBlur}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              maxLength={9}
              disabled={!isPro}
              error={customError ?? undefined}
            />
            {!isPro ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('branding.customColourProA11y')}
                onPress={openPaywall}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
          </View>
        </View>

        <Input
          label={t('branding.footerMessage')}
          placeholder={t('branding.footerMessagePlaceholder')}
          value={footerMessage}
          onChangeText={setFooterMessage}
        />

        <Pressable
          onPress={isPro ? undefined : () => router.push({ pathname: '/paywall', params: { trigger: 'logo' } })}
          accessibilityRole={isPro ? 'text' : 'button'}
          accessibilityLabel={isPro ? t('branding.logoEnabledA11y') : t('branding.upgradeForLogoA11y')}
          style={styles.labelRow}
        >
          <Text variant="label" color={colors.textSecondary}>
            {t('branding.logoOnReports')}
          </Text>
          {!isPro ? <StatusBadge label={t('branding.proBadge')} tone="accent" /> : <StatusBadge label={t('branding.enabledBadge')} tone="success" />}
        </Pressable>
      </ScrollView>
      <PermissionNotice visible={permissionDenied} kind="library" onDismiss={() => setPermissionDenied(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap' },
  swatch: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  customSlot: { width: 36, height: 36 },
  example: { width: '100%', aspectRatio: 210 / 297, borderWidth: 1, overflow: 'hidden' },
});

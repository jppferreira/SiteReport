import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { fontFamily, useTheme } from '@/theme';

const BEFORE_PHOTO = require('../../assets/images/kitchen-before.jpg');
const AFTER_PHOTO = require('../../assets/images/report-cover.jpg');

/** Quiet sample report on the first onboarding screen. Photos sit behind it once. */
export function ProofCollage() {
  const { colors, shadows } = useTheme();
  const { t } = useI18n();

  return (
    <View style={styles.stage} accessibilityElementsHidden>
      <View style={[styles.glow, { backgroundColor: colors.accentSoft }]} />

      <View style={styles.fan}>
        <PhotoCard source={BEFORE_PHOTO} label={t('onboarding.proofBefore')} style={styles.beforeCard} shadow={shadows.card} />
        <PhotoCard source={AFTER_PHOTO} label={t('onboarding.proofAfter')} style={styles.afterCard} shadow={shadows.card} />
      </View>

      <View style={[styles.report, shadows.card, { backgroundColor: colors.surface }]}>
        <View style={styles.reportTop}>
          <View style={styles.reportTitleRow}>
            <Ionicons name="document-text-outline" size={13} color={colors.textPrimary} />
            <Text style={[styles.reportTitle, { color: colors.textPrimary }]} allowFontScaling={false}>
              {t('onboarding.proofJobReport')}
            </Text>
          </View>
          <View style={[styles.houseBadge, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="home" size={12} color={colors.accent} />
          </View>
        </View>

        <Text style={[styles.company, { color: colors.textPrimary }]} allowFontScaling={false} numberOfLines={1}>
          {t('onboarding.proofCompany')}
        </Text>
        <Text style={[styles.tagline, { color: colors.textTertiary }]} allowFontScaling={false} numberOfLines={1}>
          {t('onboarding.proofCompanyTagline')}
        </Text>

        <Text style={[styles.jobName, { color: colors.textPrimary }]} allowFontScaling={false} numberOfLines={1}>
          {t('onboarding.proofJobName')}
        </Text>
        <Text style={[styles.clientName, { color: colors.textSecondary }]} allowFontScaling={false} numberOfLines={1}>
          {t('onboarding.proofClientName')}
        </Text>

        <View style={[styles.signOff, { borderTopColor: colors.border }]}>
          <Text style={[styles.signLabel, { color: colors.textTertiary }]} allowFontScaling={false}>
            {t('onboarding.proofClientLabel')}
          </Text>
          <Svg width={108} height={32} viewBox="0 0 108 32">
            <Path
              d="M4 22 C 14 6, 22 6, 26 18 C 30 28, 22 26, 34 12 C 48 0, 62 26, 80 16 C 90 10, 98 8, 104 14"
              stroke={colors.textPrimary}
              strokeWidth={1.6}
              fill="none"
              strokeLinecap="round"
            />
          </Svg>
          <Text style={[styles.signName, { color: colors.textTertiary }]} allowFontScaling={false} numberOfLines={1}>
            {t('onboarding.proofClientName')}
          </Text>
          <Text style={[styles.signLabel, { color: colors.textTertiary, marginTop: 10 }]} allowFontScaling={false}>
            {t('onboarding.proofTradespersonLabel')}
          </Text>
          <Svg width={108} height={32} viewBox="0 0 108 32">
            <Path
              d="M6 24 C 18 8, 28 28, 40 14 C 52 2, 58 30, 74 18 C 86 10, 94 12, 102 20"
              stroke={colors.textPrimary}
              strokeWidth={1.6}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M28 26 C 42 22, 56 28, 72 24"
              stroke={colors.textPrimary}
              strokeWidth={1.2}
              fill="none"
              strokeLinecap="round"
            />
          </Svg>
          <Text style={[styles.signName, { color: colors.textTertiary }]} allowFontScaling={false} numberOfLines={1}>
            {t('onboarding.proofTradespersonName')}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PhotoCard({
  source,
  label,
  style,
  shadow,
}: {
  source: ImageSource;
  label: string;
  style: ViewStyle;
  shadow: ViewStyle;
}) {
  return (
    <View style={[styles.photoCard, shadow, style]}>
      <View style={styles.photo}>
        <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
        <View style={styles.pill}>
          <Text style={styles.pillText} allowFontScaling={false}>
            {label}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    marginTop: 8,
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    left: '50%',
    marginLeft: -110,
    top: 36,
  },
  fan: {
    height: 168,
  },
  photoCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 18,
  },
  beforeCard: {
    width: '48%',
    left: 0,
    top: 18,
    zIndex: 1,
    transform: [{ rotate: '12deg' }],
  },
  afterCard: {
    width: '50%',
    right: 0,
    top: 0,
    zIndex: 2,
    transform: [{ rotate: '-8deg' }],
  },
  photo: {
    height: 118,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pill: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: '#1C1F1C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    lineHeight: 13,
  },
  report: {
    marginTop: -8,
    marginHorizontal: 10,
    zIndex: 3,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  reportTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 16,
  },
  houseBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  company: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 14,
  },
  tagline: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  jobName: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 16,
  },
  clientName: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  signOff: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  signLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  signName: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
  },
});

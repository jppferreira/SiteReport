import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

import { GuidedStepId } from './guidedSteps';
import { iconForStep } from './stepIcons';

export type ReportReadyStat = {
  id: GuidedStepId | 'report';
  title: string;
  subtitle: string;
};

type ReportReadyViewProps = {
  jobTitle: string;
  customerName: string | null;
  stats: ReportReadyStat[];
  templateName: string;
  templateMeta: string;
  templateFree: boolean;
  onChangeTemplate: () => void;
  onCreatePdf: () => void;
  onSend: () => void;
};

export function ReportReadyView({
  jobTitle,
  customerName,
  stats,
  templateName,
  templateMeta,
  templateFree,
  onChangeTemplate,
  onCreatePdf,
  onSend,
}: ReportReadyViewProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const subtitle = customerName
    ? t('jobDetail.guided.reportReadySubtitle', { title: jobTitle, customer: customerName })
    : t('jobDetail.guided.reportReadySubtitleNoCustomer', { title: jobTitle });

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <View style={styles.bigRing}>
          <View style={[styles.ringTrack, { borderColor: colors.accent }]} />
          <View
            style={[
              styles.checkBubble,
              {
                backgroundColor: colors.accent,
                shadowColor: colors.accent,
              },
            ]}
          >
            <Ionicons name="checkmark" size={30} color={colors.accentOnAccent} />
          </View>
          <View style={[styles.confetti, styles.c1, { backgroundColor: colors.accent }]} />
          <View style={[styles.confetti, styles.c2, { backgroundColor: '#F5C542' }]} />
          <View style={[styles.confetti, styles.c3, { backgroundColor: colors.accent }]} />
          <View style={[styles.confetti, styles.c4, { backgroundColor: '#F5C542' }]} />
          <View style={[styles.confetti, styles.c5, { backgroundColor: '#7BD69A' }]} />
        </View>
        <Text variant="h1" style={styles.heroTitle}>
          {t('jobDetail.guided.reportReadyTitle')}
        </Text>
        <Text variant="caption" color={colors.textSecondary} style={styles.heroSubtitle}>
          {subtitle}
        </Text>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {stats.map((stat) => (
          <View key={stat.id} style={styles.stat}>
            <View style={[styles.statIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons
                name={stat.id === 'report' ? 'document-text-outline' : iconForStep(stat.id as GuidedStepId)}
                size={16}
                color={colors.accentPressed}
              />
            </View>
            <View style={styles.statCopy}>
              <Text variant="bodySmall" style={styles.statTitle}>
                {stat.title}
              </Text>
              <Text variant="caption" color={colors.textTertiary} style={styles.statSubtitle}>
                {stat.subtitle}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        onPress={onChangeTemplate}
        style={({ pressed }) => [
          styles.pdfCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={[styles.miniCover, { borderColor: colors.border }]}>
          <View style={[styles.miniCoverHeader, { backgroundColor: colors.textPrimary }]}>
            <View style={[styles.miniLogo, { backgroundColor: colors.accent }]} />
            <Text style={styles.miniBrand}>{t('jobDetail.guided.miniBrand')}</Text>
            <Text style={styles.miniProduct}>TRADE REPORT</Text>
          </View>
          <View style={[styles.miniCoverPhoto, { backgroundColor: colors.surfaceSunken }]} />
        </View>
        <View style={styles.pdfCopy}>
          <View style={styles.pdfTitleRow}>
            <Text variant="bodyMedium" style={styles.pdfTitle}>
              {templateName}
            </Text>
            {templateFree ? (
              <View style={[styles.freeChip, { backgroundColor: colors.accentSoft }]}>
                <Text variant="caption" color={colors.accentPressed} style={styles.freeLabel}>
                  {t('jobDetail.guided.free')}
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="caption" color={colors.textSecondary} style={styles.pdfMeta}>
            {templateMeta}
          </Text>
          <Text variant="caption" color={colors.accent} style={styles.changeTemplate}>
            {t('jobDetail.guided.changeTemplate')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>

      <View style={[styles.actions, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Pressable
          onPress={onCreatePdf}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.ctaDark, opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <Ionicons name="document-text-outline" size={18} color={colors.textInverse} />
          <Text variant="button" color={colors.textInverse} style={styles.btnLabel}>
            {t('jobDetail.guided.createPdf')}
          </Text>
        </Pressable>
        <Pressable
          onPress={onSend}
          style={({ pressed }) => [
            styles.secondaryBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderStrong,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <Ionicons name="send-outline" size={18} color={colors.textPrimary} />
          <Text variant="button" style={styles.btnLabel}>
            {t('jobDetail.guided.sendToCustomer')}
          </Text>
        </Pressable>
        <View style={styles.reviewNote}>
          <Ionicons name="star-outline" size={12} color={colors.textTertiary} />
          <Text variant="caption" color={colors.textTertiary} style={styles.reviewLabel}>
            {t('jobDetail.guided.reviewNote')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 8,
    gap: 8,
  },
  bigRing: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTrack: {
    ...StyleSheet.absoluteFill,
    borderRadius: 48,
    borderWidth: 6,
  },
  checkBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  confetti: {
    position: 'absolute',
    width: 7,
    height: 11,
    borderRadius: 2,
  },
  c1: { left: 8, top: 52 },
  c2: { right: 4, top: 18, transform: [{ rotate: '-30deg' }] },
  c3: { right: -2, top: 58, transform: [{ rotate: '-45deg' }] },
  c4: { left: -4, top: 62, transform: [{ rotate: '-20deg' }] },
  c5: { left: 28, top: 4 },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: fontFamily.bold,
    letterSpacing: -0.28,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fontFamily.regular,
    letterSpacing: 0,
    textAlign: 'center',
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    columnGap: 15,
  },
  stat: {
    width: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCopy: {
    flexShrink: 1,
  },
  statTitle: {
    fontSize: 14,
    fontFamily: fontFamily.semibold,
  },
  statSubtitle: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    letterSpacing: 0,
  },
  pdfCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  miniCover: {
    width: 54,
    height: 72,
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  miniCoverHeader: {
    height: 30,
    paddingLeft: 6,
    paddingTop: 7,
    gap: 2,
  },
  miniLogo: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  miniBrand: {
    color: '#FFFFFF',
    fontSize: 5,
    fontFamily: fontFamily.bold,
    letterSpacing: 0.5,
  },
  miniProduct: {
    color: '#FFFFFF',
    fontSize: 5.5,
    fontFamily: fontFamily.bold,
  },
  miniCoverPhoto: {
    flex: 1,
  },
  pdfCopy: {
    flex: 1,
    gap: 4,
  },
  pdfTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pdfTitle: {
    fontSize: 15,
    fontFamily: fontFamily.semibold,
  },
  freeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  freeLabel: {
    fontSize: 10,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0,
  },
  pdfMeta: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    letterSpacing: 0,
  },
  changeTemplate: {
    fontSize: 12,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0,
  },
  actions: {
    marginTop: 'auto',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 10,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtn: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnLabel: {
    fontSize: 15,
  },
  reviewNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  reviewLabel: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    letterSpacing: 0,
  },
});

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import { Button, Screen, Text, TextButton } from '@/components';
import { fontFamily, useTheme } from '@/theme';

import { StepDots } from './StepDots';

type OnboardingScreenProps = {
  children: React.ReactNode;
  /** 1-based step. Drives the progress indicator. */
  step: number;
  totalSteps?: number;
  ctaLabel: string;
  onCta: () => void;
  ctaLoading?: boolean;
  /** Small gray line under the button, used on the first screen. */
  footnote?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** The finish step has no numbered badge. */
  showBadge?: boolean;
  /** Top bar (legacy) or bottom dots (current Figma). */
  progressVariant?: 'bar' | 'dots';
  keyboardAvoiding?: boolean;
};

export function OnboardingScreen({
  children,
  step,
  totalSteps = 6,
  ctaLabel,
  onCta,
  ctaLoading = false,
  footnote,
  secondaryLabel,
  onSecondary,
  showBadge = true,
  progressVariant = 'dots',
  keyboardAvoiding = false,
}: OnboardingScreenProps) {
  const { colors, spacing, radius } = useTheme();
  const progress = Math.min(1, Math.max(0, step / totalSteps));
  const useDots = progressVariant === 'dots';

  const body = (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xs }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {showBadge ? <StepBadge step={step} /> : null}
        {children}
      </ScrollView>

      <View style={[styles.footer, { paddingTop: spacing.sm, gap: spacing.xs }]}>
        <Button
          label={ctaLabel}
          onPress={onCta}
          variant="accent"
          loading={ctaLoading}
          testID="onboarding-cta"
          style={{ borderRadius: radius.lg }}
        />
        {footnote ? (
          <Text variant="caption" color={colors.textTertiary} style={styles.footnote}>
            {footnote}
          </Text>
        ) : null}
        {secondaryLabel && onSecondary ? (
          <TextButton label={secondaryLabel} onPress={onSecondary} tone="accent" disabled={ctaLoading} />
        ) : null}
        {useDots ? (
          <View style={styles.dotsFooter}>
            <StepDots step={step} totalSteps={totalSteps} />
          </View>
        ) : null}
      </View>
    </>
  );

  return (
    <Screen
      edges={['top', 'left', 'right', 'bottom']}
      style={{ backgroundColor: colors.background, paddingHorizontal: spacing.xl }}
    >
      {!useDots ? (
        <View
          style={[styles.track, { backgroundColor: colors.border, marginTop: spacing.sm }]}
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${step} of ${totalSteps}`}
          accessibilityValue={{ min: 0, max: totalSteps, now: step }}
        >
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
        </View>
      ) : null}

      {keyboardAvoiding ? (
        <KeyboardAvoidingView style={styles.scroll} behavior="padding">
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </Screen>
  );
}

export function OnboardingHeading({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ marginTop: spacing.sm, gap: spacing.md }}>
      <Text accessibilityRole="header" style={[styles.headline, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.subhead, { color: colors.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

export function StepNumberBadge({
  label,
  size = 36,
  fontSize = 16,
  style,
}: {
  label: string;
  size?: number;
  fontSize?: number;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: fontFamily.bold,
          fontSize,
          lineHeight: fontSize + 4,
          color: colors.accent,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function StepBadge({ step }: { step: number }) {
  return <StepNumberBadge label={String(step)} style={{ marginTop: 22 }} />;
}

export function IconBadge({
  name,
  size = 44,
  iconSize = 22,
}: {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  iconSize?: number;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={name} size={iconSize} color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  footer: {
    paddingBottom: 4,
  },
  dotsFooter: {
    paddingTop: 8,
    alignItems: 'center',
  },
  footnote: {
    textAlign: 'center',
    marginTop: 6,
  },
  headline: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  subhead: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
  },
});

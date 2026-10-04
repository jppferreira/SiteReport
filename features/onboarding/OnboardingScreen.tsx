import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, Text, TextButton } from '@/components';
import { useTheme } from '@/theme';

type OnboardingScreenProps = {
  step: number;
  totalSteps: number;
  illustration: React.ReactNode;
  title: string;
  description: React.ReactNode;
  ctaLabel: string;
  onCta: () => void;
  onSkip?: () => void;
};

export function OnboardingScreen({
  step,
  totalSteps,
  illustration,
  title,
  description,
  ctaLabel,
  onCta,
  onSkip,
}: OnboardingScreenProps) {
  const { colors, spacing } = useTheme();

  return (
    <Screen padded>
      <View style={styles.topRow}>
        <View style={styles.dots}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index === step ? colors.ctaDark : colors.border },
              ]}
            />
          ))}
        </View>
        {onSkip ? <TextButton label="Skip" onPress={onSkip} align="left" /> : <View style={{ height: 36 }} />}
      </View>

      <View style={styles.illustration}>{illustration}</View>

      <View style={{ marginTop: spacing.xl }}>
        <Text variant="display" style={{ marginBottom: spacing.sm }}>
          {title}
        </Text>
        <View>{description}</View>
      </View>

      <View style={styles.ctaContainer}>
        <Button label={ctaLabel} onPress={onCta} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 20,
    height: 4,
    borderRadius: 2,
  },
  illustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  ctaContainer: {
    paddingBottom: 24,
    paddingTop: 16,
  },
});

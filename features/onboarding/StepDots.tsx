import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

type StepDotsProps = {
  step: number;
  totalSteps: number;
};

export function StepDots({ step, totalSteps }: StepDotsProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <View
      style={styles.dots}
      accessibilityRole="progressbar"
      accessibilityLabel={t('onboarding.stepDotsA11y', { step, total: totalSteps })}
      accessibilityValue={{ min: 0, max: totalSteps, now: step }}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const active = i + 1 === step;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: active ? colors.accent : colors.borderStrong,
                width: active ? 18 : 7,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 7,
    borderRadius: 999,
  },
});

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { AppText } from './AppText';

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function SectionHeader({ title, subtitle, action }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.textWrap}>
        <AppText variant="h3">{title}</AppText>
        {subtitle ? (
          <AppText variant="bodySmall" color={colors.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  textWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
});

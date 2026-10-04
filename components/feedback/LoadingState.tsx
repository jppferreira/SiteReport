import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { AppText } from '@/components/core/AppText';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.textPrimary} />
      <AppText variant="bodySmall" color={colors.textSecondary}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: spacing.x3,
    gap: spacing.sm,
    alignItems: 'center',
  },
});

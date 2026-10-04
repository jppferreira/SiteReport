import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { Button } from '@/components/core/Button';
import { AppText } from '@/components/core/AppText';

type Props = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: Props) {
  return (
    <View style={styles.root}>
      <AppText variant="h3">{title}</AppText>
      <AppText variant="body" color={colors.textSecondary} style={styles.description}>
        {description}
      </AppText>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: spacing.x5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  description: {
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    minWidth: 180,
  },
});

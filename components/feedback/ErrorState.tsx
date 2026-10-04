import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/core/Button';
import { AppText } from '@/components/core/AppText';
import { colors, spacing } from '@/theme';

type Props = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorState({ title, description, actionLabel, onAction }: Props) {
  return (
    <View style={styles.root}>
      <AppText variant="h3">{title}</AppText>
      <AppText variant="body" color={colors.textSecondary} style={styles.description}>
        {description}
      </AppText>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: spacing.x4,
    gap: spacing.md,
    alignItems: 'center',
  },
  description: {
    textAlign: 'center',
    maxWidth: 330,
  },
});

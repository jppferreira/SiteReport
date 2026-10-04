import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Button, ButtonVariant } from './Button';
import { Modal } from './Modal';
import { Text } from './Text';

type ConfirmationDialogProps = {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function ConfirmationDialog({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'destructive',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmationDialogProps) {
  const { colors, radius, spacing, shadows } = useTheme();

  return (
    <Modal visible={visible} onRequestClose={onCancel} dismissOnBackdropPress={!loading}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl },
          shadows.overlay,
        ]}
        accessibilityViewIsModal
        accessibilityRole="alert"
      >
        <Text variant="h3">{title}</Text>
        {description ? (
          <Text variant="body" color={colors.textSecondary} style={{ marginTop: 8 }}>
            {description}
          </Text>
        ) : null}
        <View style={{ marginTop: spacing.xl, gap: spacing.xs }}>
          <Button label={confirmLabel} onPress={onConfirm} variant={confirmVariant} loading={loading} />
          <Button label={cancelLabel} onPress={onCancel} variant="tertiary" disabled={loading} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
});

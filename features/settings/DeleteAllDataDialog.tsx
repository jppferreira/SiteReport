import React, { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Modal, Text } from '@/components';
import { useTheme } from '@/theme';

const CONFIRM_WORD = 'DELETE';

type DeleteAllDataDialogProps = {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function DeleteAllDataDialog({ visible, onConfirm, onCancel, loading = false }: DeleteAllDataDialogProps) {
  const { colors, radius, spacing, shadows } = useTheme();
  const [value, setValue] = useState('');
  const canConfirm = value.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <Modal visible={visible} onRequestClose={onCancel} dismissOnBackdropPress={!loading}>
      <View style={[{ backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl }, shadows.overlay]}>
        <Text variant="h3">Delete all app data?</Text>
        <Text variant="body" color={colors.textSecondary} style={{ marginTop: 8 }}>
          This permanently removes every job, photo, signature and report from this device, along with your
          business profile. This cannot be undone.
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.lg }}>
          Type DELETE to confirm.
        </Text>
        <View style={{ marginTop: spacing.xs }}>
          <Input value={value} onChangeText={setValue} placeholder="DELETE" autoCapitalize="characters" autoCorrect={false} />
        </View>
        <View style={{ marginTop: spacing.xl, gap: spacing.xs }}>
          <Button label="Delete everything" variant="destructive" onPress={onConfirm} disabled={!canConfirm} loading={loading} />
          <Button label="Cancel" variant="tertiary" onPress={onCancel} disabled={loading} />
        </View>
      </View>
    </Modal>
  );
}

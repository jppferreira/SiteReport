import React, { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Modal, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
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
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const canConfirm = value.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <Modal visible={visible} onRequestClose={onCancel} dismissOnBackdropPress={!loading}>
      <View style={[{ backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl }, shadows.overlay]}>
        <Text variant="h3">{t('data.deleteAllTitle')}</Text>
        <Text variant="body" color={colors.textSecondary} style={{ marginTop: 8 }}>
          {t('data.deleteAllBody')}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.lg }}>
          {t('data.deleteAllTypeToConfirm')}
        </Text>
        <View style={{ marginTop: spacing.xs }}>
          <Input
            value={value}
            onChangeText={setValue}
            placeholder={t('data.deleteAllPlaceholder')}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>
        <View style={{ marginTop: spacing.xl, gap: spacing.xs }}>
          <Button
            label={t('data.deleteAllConfirm')}
            variant="destructive"
            onPress={onConfirm}
            disabled={!canConfirm}
            loading={loading}
          />
          <Button label={t('data.deleteAllCancel')} variant="tertiary" onPress={onCancel} disabled={loading} />
        </View>
      </View>
    </Modal>
  );
}

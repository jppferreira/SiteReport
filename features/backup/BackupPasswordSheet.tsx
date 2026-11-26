import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Modal, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

type BackupPasswordSheetProps = {
  visible: boolean;
  mode: 'save' | 'restore';
  loading?: boolean;
  onConfirm: (password: string | null) => void;
  onCancel: () => void;
};

export function BackupPasswordSheet({ visible, mode, loading = false, onConfirm, onCancel }: BackupPasswordSheetProps) {
  const { colors, spacing, radius, shadows } = useTheme();
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    if (!visible) return;
    setPassword('');
    setConfirm('');
  }, [visible]);

  const mismatch = password.length > 0 && confirm.length > 0 && password !== confirm;
  const canSave = mode === 'save' && password.length > 0 && password === confirm;
  const canRestore = mode === 'restore' && password.length > 0;

  return (
    <Modal visible={visible} onRequestClose={onCancel} dismissOnBackdropPress={!loading}>
      <View
        accessible={false}
        style={[
          {
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            padding: spacing.xl,
            gap: spacing.md,
          },
          shadows.overlay,
        ]}
      >
        <Text variant="h3">
          {mode === 'save' ? t('data.backupPasswordSaveTitle') : t('data.backupPasswordRestoreTitle')}
        </Text>
        <Text variant="body" color={colors.textSecondary}>
          {mode === 'save' ? t('data.backupPasswordSaveHint') : t('data.backupPasswordRestoreHint')}
        </Text>
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder={t('data.backupPasswordPlaceholder')}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        {mode === 'save' ? (
          <Input
            value={confirm}
            onChangeText={setConfirm}
            placeholder={t('data.backupPasswordConfirmPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        ) : null}
        {mismatch ? (
          <Text variant="caption" color={colors.destructive}>
            {t('data.backupPasswordMismatch')}
          </Text>
        ) : null}
        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          <Button
            label={mode === 'save' ? t('common.save') : t('data.backupRestoreConfirm')}
            disabled={mode === 'save' ? !canSave : !canRestore}
            loading={loading}
            testID="backup-password-confirm"
            onPress={() => onConfirm(mode === 'save' ? password : password)}
          />
          {mode === 'save' ? (
            <Button
              label={t('data.backupNoPassword')}
              variant="tertiary"
              disabled={loading}
              testID="backup-save-without-password"
              onPress={() => onConfirm(null)}
            />
          ) : null}
          <Button
            label={t('common.cancel')}
            variant="tertiary"
            disabled={loading}
            testID="backup-password-cancel"
            onPress={onCancel}
          />
        </View>
      </View>
    </Modal>
  );
}
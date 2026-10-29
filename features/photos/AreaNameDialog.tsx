import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Input, Modal, Text, ToggleRow } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { normalizeAreaName } from '@/models';
import { useTheme } from '@/theme';

type AreaNameDialogProps = {
  visible: boolean;
  title: string;
  confirmLabel: string;
  initialName: string;
  saving?: boolean;
  moveExisting?: {
    count: number;
    value: boolean;
    onChange: (value: boolean) => void;
  } | null;
  onCancel: () => void;
  onSubmit: (name: string) => void;
};

export function AreaNameDialog({
  visible,
  title,
  confirmLabel,
  initialName,
  saving = false,
  moveExisting = null,
  onCancel,
  onSubmit,
}: AreaNameDialogProps) {
  const { colors, radius, spacing, shadows } = useTheme();
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const cleaned = normalizeAreaName(name);

  return (
    <Modal visible={visible} onRequestClose={onCancel} dismissOnBackdropPress={!saving}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl },
          shadows.overlay,
        ]}
      >
        <Text variant="h3">{title}</Text>
        <Text variant="body" color={colors.textSecondary} style={{ marginTop: 8 }}>
          {t('photos.areaNameHint')}
        </Text>
        <View style={{ marginTop: spacing.lg }}>
          <Input
            label={t('photos.areaNameLabel')}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={() => {
              if (cleaned) onSubmit(cleaned);
            }}
          />
        </View>
        {moveExisting && moveExisting.count > 0 ? (
          <ToggleRow
            label={t('photos.areaNameMovePhotos')}
            description={t('photos.areaNameMovePhotosDescription', {
              count: moveExisting.count,
              unit: moveExisting.count === 1 ? t('common.photo') : t('common.photos'),
            })}
            value={moveExisting.value}
            onValueChange={moveExisting.onChange}
            disabled={saving}
          />
        ) : null}
        <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>
          <Button
            label={confirmLabel}
            onPress={() => onSubmit(cleaned)}
            disabled={!cleaned}
            loading={saving}
          />
          <Button label={t('common.cancel')} onPress={onCancel} variant="tertiary" disabled={saving} />
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

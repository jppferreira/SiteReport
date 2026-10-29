import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Input, Modal, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { normalizeReportFileName, reportFileExtension, reportFileStem } from '@/utils/fileNaming';

type RenameReportDialogProps = {
  visible: boolean;
  fileName: string;
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (fileName: string) => void;
};

export function RenameReportDialog({ visible, fileName, saving = false, onCancel, onSubmit }: RenameReportDialogProps) {
  return (
    <Modal visible={visible} onRequestClose={onCancel} dismissOnBackdropPress={!saving}>
      {visible ? (
        <RenameReportForm fileName={fileName} saving={saving} onCancel={onCancel} onSubmit={onSubmit} />
      ) : null}
    </Modal>
  );
}

function RenameReportForm({
  fileName,
  saving,
  onCancel,
  onSubmit,
}: Omit<RenameReportDialogProps, 'visible'>) {
  const { colors, radius, spacing, shadows } = useTheme();
  const { t } = useI18n();
  const extension = reportFileExtension(fileName);
  const [name, setName] = useState(reportFileStem(fileName));
  const nextName = normalizeReportFileName(name, extension);
  const unchanged = nextName === fileName;

  const submit = () => {
    if (!nextName || unchanged) {
      onCancel();
      return;
    }
    onSubmit(nextName);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl },
        shadows.overlay,
      ]}
    >
      <Text variant="h3">{t('reports.renameDialogTitle')}</Text>
      <Text variant="body" color={colors.textSecondary} style={{ marginTop: 8 }}>
        {extension === 'html' ? t('reports.renameDialogBodyReport') : t('reports.renameDialogBodyPdf')}
      </Text>
      <View style={{ marginTop: spacing.lg }}>
        <Input
          label={t('reports.renameDialogFileName')}
          value={name}
          onChangeText={setName}
          autoFocus
          autoCapitalize="sentences"
          autoCorrect={false}
          returnKeyType="done"
          maxLength={80}
          helperText={t('reports.renameDialogSavedAs', { extension })}
          onSubmitEditing={submit}
        />
      </View>
      <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>
        <Button
          label={t('reports.renameDialogRename')}
          onPress={submit}
          disabled={!nextName || unchanged}
          loading={saving}
        />
        <Button label={t('reports.renameDialogCancel')} onPress={onCancel} variant="tertiary" disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
});

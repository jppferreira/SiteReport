import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { Button } from './Button';
import { Modal } from './Modal';
import { Text } from './Text';

type PermissionNoticeProps = {
  visible: boolean;
  kind: 'camera' | 'library';
  onDismiss: () => void;
};

export function PermissionNotice({ visible, kind, onDismiss }: PermissionNoticeProps) {
  const { colors, radius, spacing, shadows } = useTheme();
  const { t } = useI18n();
  const label = kind === 'camera' ? t('components.permissionCameraTitle') : t('components.permissionLibraryTitle');
  const description =
    kind === 'camera' ? t('components.permissionCameraBody') : t('components.permissionLibraryBody');

  return (
    <Modal visible={visible} onRequestClose={onDismiss}>
      <View
        style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl }, shadows.overlay]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.warningSoft, borderRadius: radius.lg }]}>
          <Ionicons name="camera-outline" size={24} color={colors.warning} />
        </View>
        <Text variant="h3" style={{ marginTop: spacing.md }}>
          {label}
        </Text>
        <Text variant="body" color={colors.textSecondary} style={{ marginTop: 8 }}>
          {description}
        </Text>
        <View style={{ marginTop: spacing.xl, gap: spacing.xs }}>
          <Button label={t('components.permissionOpenSettings')} onPress={() => Linking.openSettings()} />
          <Button label={t('components.permissionNotNow')} variant="tertiary" onPress={onDismiss} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  iconWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});

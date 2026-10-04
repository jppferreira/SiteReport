import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React from 'react';
import { StyleSheet, View } from 'react-native';

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
  const label = kind === 'camera' ? 'Camera access is turned off.' : 'Photo library access is turned off.';
  const description =
    kind === 'camera'
      ? 'Allow camera access in Settings so you can take before and after job photos.'
      : 'Allow photo library access in Settings so you can add existing photos to this job.';

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
          <Button label="Open Settings" onPress={() => Linking.openSettings()} />
          <Button label="Not now" variant="tertiary" onPress={onDismiss} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  iconWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});

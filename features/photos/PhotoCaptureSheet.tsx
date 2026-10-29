import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

type PhotoCaptureSheetProps = {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
  label: string;
};

export function PhotoCaptureSheet({ visible, onClose, onTakePhoto, onChooseFromLibrary, label }: PhotoCaptureSheetProps) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text variant="h3" style={{ marginBottom: spacing.xs }}>
        {t('photos.captureSheetTitle', { label })}
      </Text>
      <Text variant="bodySmall" color={colors.textSecondary} style={{ marginBottom: spacing.lg }}>
        {t('photos.captureSheetSubtitle')}
      </Text>

      <View style={{ gap: spacing.xs }}>
        <SheetAction
          icon="camera"
          label={t('photos.captureTakePhoto')}
          onPress={() => {
            onClose();
            onTakePhoto();
          }}
        />
        <SheetAction
          icon="images"
          label={t('photos.captureChoosePhotos')}
          onPress={() => {
            onClose();
            onChooseFromLibrary();
          }}
        />
      </View>
    </BottomSheet>
  );
}

function SheetAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: colors.surfaceSunken,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={colors.textPrimary} style={{ marginRight: spacing.sm }} />
      <Text variant="bodyMedium">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
  },
});

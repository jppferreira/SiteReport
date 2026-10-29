import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton, LocalImage, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { Photo } from '@/models';
import { useTheme } from '@/theme';

type AreaRowProps = {
  title: string;
  subtitle: string;
  photos: Photo[];
  onPress: () => void;
  onMenu?: () => void;
  showDivider?: boolean;
};

export function AreaRow({ title, subtitle, photos, onPress, onMenu, showDivider = false }: AreaRowProps) {
  const { colors, radius } = useTheme();
  const { t } = useI18n();
  const preview = photos.slice(0, 4);

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.border, borderBottomWidth: showDivider ? StyleSheet.hairlineWidth : 0 },
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('photos.areaRowA11y', { title, subtitle })}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={styles.copy}>
          <Text variant="bodyMedium">{title}</Text>
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
          {preview.length > 0 ? (
            <View style={styles.thumbs}>
              {preview.map((photo) => (
                <LocalImage
                  key={photo.id}
                  uri={photo.thumbnailUri}
                  contentFit="cover"
                  style={[styles.thumb, { borderRadius: radius.sm, backgroundColor: colors.surfaceSunken }]}
                />
              ))}
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>
      {onMenu ? (
        <IconButton
          name="ellipsis-horizontal"
          accessibilityLabel={t('photos.areaOptionsA11y', { title })}
          onPress={onMenu}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 8,
    gap: 8,
  },
  copy: {
    flex: 1,
  },
  thumbs: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  thumb: {
    width: 44,
    height: 44,
  },
});

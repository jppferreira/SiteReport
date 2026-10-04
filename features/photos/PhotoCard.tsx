import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { Photo } from '@/models';
import { useTheme } from '@/theme';

type PhotoCardProps = {
  photo: Photo;
  onPress: () => void;
  reorderMode?: boolean;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
};

export function PhotoCard({
  photo,
  onPress,
  reorderMode = false,
  onMoveLeft,
  onMoveRight,
  canMoveLeft = false,
  canMoveRight = false,
}: PhotoCardProps) {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={photo.caption ? `Photo: ${photo.caption}` : 'Photo'}
      style={[styles.container, { borderRadius: radius.md, backgroundColor: colors.surfaceSunken }]}
    >
      <Image source={{ uri: photo.thumbnailUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      {photo.caption ? (
        <View style={[styles.captionBadge, { backgroundColor: 'rgba(16,19,16,0.65)' }]}>
          <Text variant="caption" color="#FFFFFF" numberOfLines={1}>
            {photo.caption}
          </Text>
        </View>
      ) : null}

      {reorderMode ? (
        <View style={styles.reorderOverlay} pointerEvents="box-none">
          {canMoveLeft ? (
            <Pressable
              onPress={onMoveLeft}
              accessibilityRole="button"
              accessibilityLabel="Move photo earlier"
              style={[styles.reorderButton, { left: 6, backgroundColor: colors.surface }]}
            >
              <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
            </Pressable>
          ) : null}
          {canMoveRight ? (
            <Pressable
              onPress={onMoveRight}
              accessibilityRole="button"
              accessibilityLabel="Move photo later"
              style={[styles.reorderButton, { right: 6, backgroundColor: colors.surface }]}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    aspectRatio: 1,
    overflow: 'hidden',
    flex: 1,
  },
  captionBadge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  reorderOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
  },
  reorderButton: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

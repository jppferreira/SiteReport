import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import type { Photo } from '@/models/domain';
import { colors, radius, spacing } from '@/theme';
import { AppText } from '@/components/core/AppText';

type Props = {
  photos: Photo[];
  onPressPhoto: (photo: Photo) => void;
  onReorder: (orderedIds: string[]) => void;
};

export function PhotoGrid({ photos, onPressPhoto, onReorder }: Props) {
  return (
    <DraggableFlatList
      data={photos}
      keyExtractor={(item) => item.id}
      numColumns={2}
      containerStyle={styles.list}
      contentContainerStyle={styles.content}
      columnWrapperStyle={styles.row}
      activationDistance={12}
      onDragEnd={({ data }) => onReorder(data.map((photo) => photo.id))}
      renderItem={({ item, drag, isActive }) => (
        <ScaleDecorator activeScale={0.98}>
          <Pressable
            accessibilityRole="button"
            onLongPress={drag}
            onPress={() => onPressPhoto(item)}
            style={[styles.card, isActive && styles.dragging]}>
            <Image source={{ uri: item.thumbnailUri ?? item.localUri }} style={styles.image} />
            <View style={styles.captionWrap}>
              <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
                {item.caption || 'Add caption'}
              </AppText>
            </View>
          </Pressable>
        </ScaleDecorator>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.x4,
  },
  row: {
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  card: {
    width: '49%',
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 150,
    backgroundColor: colors.skeleton,
  },
  captionWrap: {
    padding: spacing.xs,
    minHeight: 48,
  },
  dragging: {
    opacity: 0.9,
  },
});

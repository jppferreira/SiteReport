import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Photo } from '@/models';
import { useTheme } from '@/theme';

import { PhotoCard } from './PhotoCard';

type PhotoGridProps = {
  photos: Photo[];
  onPressPhoto: (photo: Photo, index: number) => void;
  reorderMode?: boolean;
  onReorder?: (orderedIds: string[]) => void;
};

const COLUMNS = 3;

export function PhotoGrid({ photos, onPressPhoto, reorderMode = false, onReorder }: PhotoGridProps) {
  const { spacing } = useTheme();

  function moveTo(index: number, newIndex: number) {
    if (newIndex < 0 || newIndex >= photos.length) return;
    const next = [...photos];
    const [moved] = next.splice(index, 1);
    next.splice(newIndex, 0, moved!);
    onReorder?.(next.map((p) => p.id));
  }

  const rows: Photo[][] = [];
  for (let i = 0; i < photos.length; i += COLUMNS) {
    rows.push(photos.slice(i, i + COLUMNS));
  }

  return (
    <View style={{ gap: spacing.xs }}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, { gap: spacing.xs }]}>
          {row.map((photo, columnIndex) => {
            const index = rowIndex * COLUMNS + columnIndex;
            return (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onPress={() => onPressPhoto(photo, index)}
                reorderMode={reorderMode}
                canMoveLeft={index > 0}
                canMoveRight={index < photos.length - 1}
                onMoveLeft={() => moveTo(index, index - 1)}
                onMoveRight={() => moveTo(index, index + 1)}
              />
            );
          })}
          {row.length < COLUMNS
            ? Array.from({ length: COLUMNS - row.length }).map((_, i) => <View key={`spacer-${i}`} style={{ flex: 1 }} />)
            : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
});

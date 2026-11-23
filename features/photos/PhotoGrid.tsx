import React, { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Photo, PhotoBrowseLayout } from '@/models';
import { useTheme } from '@/theme';

import { PhotoCard } from './PhotoCard';

type PhotoGridProps = {
  photos: Photo[];
  onPressPhoto: (photo: Photo, index: number) => void;
  onLongPressPhoto?: (photo: Photo, index: number) => void;
  layout?: PhotoBrowseLayout;
  reorderMode?: boolean;
  onReorder?: (orderedIds: string[]) => void;
  onDraggingChange?: (dragging: boolean) => void;
};

const COLUMNS = 3;
const FULL_WIDTH_ASPECT = 4 / 3;
const FULL_WIDTH_FOOTER = 88;

type SlotMetrics = {
  columns: number;
  itemWidth: number;
  itemHeight: number;
  gap: number;
};

function metricsFor(layout: PhotoBrowseLayout, width: number, gap: number): SlotMetrics {
  if (layout === 'fullWidth') {
    return {
      columns: 1,
      itemWidth: width,
      itemHeight: width / FULL_WIDTH_ASPECT + FULL_WIDTH_FOOTER,
      gap,
    };
  }
  const itemWidth = (width - gap * (COLUMNS - 1)) / COLUMNS;
  return {
    columns: COLUMNS,
    itemWidth,
    itemHeight: itemWidth,
    gap,
  };
}

function slotOrigin(index: number, metrics: SlotMetrics) {
  const col = index % metrics.columns;
  const row = Math.floor(index / metrics.columns);
  return {
    x: col * (metrics.itemWidth + metrics.gap),
    y: row * (metrics.itemHeight + metrics.gap),
  };
}

function indexFromPoint(x: number, y: number, count: number, metrics: SlotMetrics) {
  if (count <= 0) return 0;
  const col = Math.max(
    0,
    Math.min(metrics.columns - 1, Math.round(x / (metrics.itemWidth + metrics.gap)))
  );
  const row = Math.max(0, Math.round(y / (metrics.itemHeight + metrics.gap)));
  return Math.max(0, Math.min(count - 1, row * metrics.columns + col));
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function PhotoGrid({
  photos,
  onPressPhoto,
  onLongPressPhoto,
  layout = 'fullWidth',
  reorderMode = false,
  onReorder,
  onDraggingChange,
}: PhotoGridProps) {
  const { spacing } = useTheme();
  const gap = layout === 'fullWidth' ? spacing.md : spacing.xs;

  if (reorderMode) {
    return (
      <DragReorderGrid
        photos={photos}
        layout={layout}
        gap={gap}
        onReorder={onReorder}
        onDraggingChange={onDraggingChange}
      />
    );
  }

  if (layout === 'fullWidth') {
    return (
      <View style={{ gap }}>
        {photos.map((photo, index) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            layout="fullWidth"
            onPress={() => onPressPhoto(photo, index)}
            onLongPress={onLongPressPhoto ? () => onLongPressPhoto(photo, index) : undefined}
          />
        ))}
      </View>
    );
  }

  const rows: Photo[][] = [];
  for (let i = 0; i < photos.length; i += COLUMNS) {
    rows.push(photos.slice(i, i + COLUMNS));
  }

  return (
    <View style={{ gap }}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, { gap }]}>
          {row.map((photo, columnIndex) => {
            const index = rowIndex * COLUMNS + columnIndex;
            return (
              <PhotoCard
                key={photo.id}
                photo={photo}
                layout="compact"
                onPress={() => onPressPhoto(photo, index)}
                onLongPress={onLongPressPhoto ? () => onLongPressPhoto(photo, index) : undefined}
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

function DragReorderGrid({
  photos,
  layout,
  gap,
  onReorder,
  onDraggingChange,
}: {
  photos: Photo[];
  layout: PhotoBrowseLayout;
  gap: number;
  onReorder?: (orderedIds: string[]) => void;
  onDraggingChange?: (dragging: boolean) => void;
}) {
  const [width, setWidth] = useState(0);
  const [ordered, setOrdered] = useState(photos);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    setOrdered(photos);
  }, [photos]);

  const metrics = useMemo(
    () => (width > 0 ? metricsFor(layout, width, gap) : null),
    [width, layout, gap]
  );

  const rows = metrics ? Math.ceil(ordered.length / metrics.columns) : 0;
  const height = metrics ? rows * metrics.itemHeight + Math.max(0, rows - 1) * metrics.gap : 0;

  const moveDragging = (id: string, toIndex: number) => {
    setOrdered((current) => {
      const fromIndex = current.findIndex((photo) => photo.id === id);
      if (fromIndex < 0 || fromIndex === toIndex) return current;
      const next = moveItem(current, fromIndex, toIndex);
      onReorder?.(next.map((photo) => photo.id));
      return next;
    });
  };

  const setDragging = (id: string | null) => {
    setDraggingId(id);
    onDraggingChange?.(id !== null);
  };

  return (
    <View
      style={{ width: '100%', height: height || undefined, minHeight: metrics?.itemHeight }}
      onLayout={(event: LayoutChangeEvent) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth > 0 && nextWidth !== width) setWidth(nextWidth);
      }}
    >
      {metrics
        ? ordered.map((photo, index) => (
            <DraggablePhoto
              key={photo.id}
              photo={photo}
              index={index}
              count={ordered.length}
              metrics={metrics}
              layout={layout}
              draggingId={draggingId}
              onDragStart={() => setDragging(photo.id)}
              onDragMove={(toIndex) => moveDragging(photo.id, toIndex)}
              onDragEnd={() => setDragging(null)}
            />
          ))
        : null}
    </View>
  );
}

function DraggablePhoto({
  photo,
  index,
  count,
  metrics,
  layout,
  draggingId,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  photo: Photo;
  index: number;
  count: number;
  metrics: SlotMetrics;
  layout: PhotoBrowseLayout;
  draggingId: string | null;
  onDragStart: () => void;
  onDragMove: (toIndex: number) => void;
  onDragEnd: () => void;
}) {
  const origin = slotOrigin(index, metrics);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const slotX = useSharedValue(origin.x);
  const slotY = useSharedValue(origin.y);
  const active = useSharedValue(false);
  const dragIndex = useSharedValue(index);

  useEffect(() => {
    dragIndex.value = index;
    // Keep the held photo under the finger; only the others slide into new slots.
    if (draggingId === photo.id) return;
    slotX.value = withSpring(origin.x, { damping: 20, stiffness: 220 });
    slotY.value = withSpring(origin.y, { damping: 20, stiffness: 220 });
  }, [origin.x, origin.y, index, draggingId, photo.id, dragIndex, slotX, slotY]);

  const pan = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      active.value = true;
      translateX.value = 0;
      translateY.value = 0;
      slotX.value = origin.x;
      slotY.value = origin.y;
      dragIndex.value = index;
      runOnJS(onDragStart)();
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      const centerX = slotX.value + metrics.itemWidth / 2 + event.translationX;
      const centerY = slotY.value + metrics.itemHeight / 2 + event.translationY;
      const toIndex = indexFromPoint(centerX, centerY, count, metrics);
      if (toIndex !== dragIndex.value) {
        dragIndex.value = toIndex;
        runOnJS(onDragMove)(toIndex);
      }
    })
    .onFinalize(() => {
      active.value = false;
      const dropX = slotX.value + translateX.value;
      const dropY = slotY.value + translateY.value;
      translateX.value = 0;
      translateY.value = 0;
      slotX.value = dropX;
      slotY.value = dropY;
      runOnJS(onDragEnd)();
    });

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: metrics.itemWidth,
    height: layout === 'compact' ? metrics.itemHeight : undefined,
    maxHeight: layout === 'fullWidth' ? metrics.itemHeight : undefined,
    overflow: 'hidden',
    zIndex: active.value ? 20 : 1,
    transform: [
      { translateX: slotX.value + translateX.value },
      { translateY: slotY.value + translateY.value },
      { scale: active.value ? 1.04 : 1 },
    ],
    shadowOpacity: active.value ? 0.22 : 0,
    shadowRadius: active.value ? 12 : 0,
    shadowOffset: { width: 0, height: 6 },
    elevation: active.value ? 8 : 0,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>
        <View style={layout === 'compact' ? styles.dragCompact : styles.dragFull} pointerEvents="none">
          <PhotoCard photo={photo} layout={layout} onPress={() => undefined} reorderMode />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  dragCompact: {
    flex: 1,
    height: '100%',
  },
  dragFull: {
    width: '100%',
  },
});

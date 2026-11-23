import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Image } from 'expo-image';

import { Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import {
  ANNOTATION_COLORS,
  ANNOTATION_STROKE,
  ANNOTATION_TOOLS,
  AnnotationColor,
  annotationLabelColor,
  AnnotationPoint,
  AnnotationShape,
  AnnotationTool,
  clampPoint,
  emptyAnnotations,
  listCallouts,
  PhotoAnnotations,
} from '@/models';
import { useTheme } from '@/theme';

import { fitContainRect } from './fitContainRect';
import { PhotoAnnotationShapes } from './PhotoAnnotationShapes';

type PhotoAnnotationEditorProps = {
  uri: string;
  photoWidth: number;
  photoHeight: number;
  initial: PhotoAnnotations | null;
  onChange: (annotations: PhotoAnnotations) => void;
  /** Photo caption shown beside the colour swatches. */
  caption?: string | null;
  onCaptionChange?: (caption: string) => void;
  /** Overlay badge on the photo, e.g. "During · 14:12". */
  stageBadge?: string | null;
  /** When set, the Done tool in the Figma toolbar calls this. */
  onDone?: () => void;
  doneLoading?: boolean;
};

type Draft =
  | { kind: 'pen'; color: AnnotationColor; width: number; points: AnnotationPoint[] }
  | { kind: 'arrow' | 'circle'; color: AnnotationColor; width: number; from: AnnotationPoint; to: AnnotationPoint }
  | { kind: 'callout'; color: AnnotationColor; at: AnnotationPoint; note: string };

function haptic() {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
}

const TOOL_META: Record<
  AnnotationTool | 'undo' | 'done',
  { icon: keyof typeof Ionicons.glyphMap; labelKey: string }
> = {
  arrow: { icon: 'arrow-up', labelKey: 'photoAnnotate.toolArrowA11y' },
  circle: { icon: 'ellipse-outline', labelKey: 'photoAnnotate.toolCircleA11y' },
  callout: { icon: 'text', labelKey: 'photoAnnotate.toolCalloutA11y' },
  pen: { icon: 'pencil', labelKey: 'photoAnnotate.toolPenA11y' },
  undo: { icon: 'arrow-undo', labelKey: 'photoAnnotate.undoA11y' },
  done: { icon: 'checkmark', labelKey: 'photoAnnotate.done' },
};

/**
 * Draw arrow / circle / text / pen marks over a job photo.
 * Layout matches Figma Field Proof · Photo markup (light canvas, labelled toolbar).
 */
export function PhotoAnnotationEditor({
  uri,
  photoWidth,
  photoHeight,
  initial,
  onChange,
  caption,
  onCaptionChange,
  stageBadge,
  onDone,
  doneLoading = false,
}: PhotoAnnotationEditorProps) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [shapes, setShapes] = useState<AnnotationShape[]>(initial?.shapes ?? []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tool, setTool] = useState<AnnotationTool>('arrow');
  const [color, setColor] = useState<AnnotationColor>(ANNOTATION_COLORS[0]);
  const [activeCallout, setActiveCallout] = useState<number | null>(null);

  const shapesRef = useRef(shapes);
  const draftRef = useRef<Draft | null>(null);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const rectRef = useRef(fitContainRect(0, 0, photoWidth, photoHeight));
  const calloutInputRef = useRef<React.ElementRef<typeof TextInput>>(null);
  shapesRef.current = shapes;
  draftRef.current = draft;
  toolRef.current = tool;
  colorRef.current = color;

  const rect = useMemo(
    () => fitContainRect(box.width, box.height, photoWidth, photoHeight),
    [box.height, box.width, photoHeight, photoWidth]
  );
  rectRef.current = rect;

  const callouts = useMemo(() => listCallouts({ version: 1, shapes }), [shapes]);

  const publish = useCallback(
    (next: AnnotationShape[]) => {
      shapesRef.current = next;
      setShapes(next);
      onChange(next.length === 0 ? emptyAnnotations() : { version: 1, shapes: next });
    },
    [onChange]
  );

  const pointFromEvent = useCallback((event: GestureResponderEvent): AnnotationPoint | null => {
    const fitted = rectRef.current;
    if (!fitted || fitted.width <= 0 || fitted.height <= 0) return null;
    const { locationX, locationY } = event.nativeEvent;
    return clampPoint({
      x: (locationX - fitted.x) / fitted.width,
      y: (locationY - fitted.y) / fitted.height,
    });
  }, []);

  const begin = useCallback(
    (event: GestureResponderEvent) => {
      const point = pointFromEvent(event);
      if (!point) return;
      const selected = toolRef.current;
      let next: Draft;
      if (selected === 'pen') {
        next = { kind: 'pen', color: colorRef.current, width: ANNOTATION_STROKE, points: [point] };
      } else if (selected === 'callout') {
        next = { kind: 'callout', color: colorRef.current, at: point, note: '' };
      } else {
        next = { kind: selected, color: colorRef.current, width: ANNOTATION_STROKE, from: point, to: point };
      }
      draftRef.current = next;
      setDraft(next);
    },
    [pointFromEvent]
  );

  const move = useCallback(
    (event: GestureResponderEvent) => {
      const point = pointFromEvent(event);
      const current = draftRef.current;
      if (!point || !current) return;
      let next: Draft;
      if (current.kind === 'pen') {
        const last = current.points[current.points.length - 1];
        if (last && Math.abs(last.x - point.x) < 0.002 && Math.abs(last.y - point.y) < 0.002) return;
        next = { ...current, points: [...current.points, point] };
      } else if (current.kind === 'callout') {
        next = { ...current, at: point };
      } else {
        next = { ...current, to: point };
      }
      draftRef.current = next;
      setDraft(next);
    },
    [pointFromEvent]
  );

  const end = useCallback(() => {
    const current = draftRef.current;
    draftRef.current = null;
    setDraft(null);
    if (!current) return;
    if (current.kind === 'pen' && current.points.length === 0) return;
    if (
      (current.kind === 'arrow' || current.kind === 'circle') &&
      Math.hypot(current.to.x - current.from.x, current.to.y - current.from.y) < 0.01
    ) {
      return;
    }
    const next = [...shapesRef.current, current];
    publish(next);
    if (current.kind === 'callout') {
      const calloutIndex = next.filter((shape) => shape.kind === 'callout').length - 1;
      setActiveCallout(calloutIndex);
      requestAnimationFrame(() => calloutInputRef.current?.focus());
    }
  }, [publish]);

  const undo = () => {
    if (shapesRef.current.length === 0) return;
    haptic();
    const next = shapesRef.current.slice(0, -1);
    publish(next);
    setActiveCallout(null);
  };

  const updateCalloutNote = (calloutIndex: number, note: string) => {
    let seen = -1;
    const next = shapesRef.current.map((shape) => {
      if (shape.kind !== 'callout') return shape;
      seen += 1;
      if (seen !== calloutIndex) return shape;
      return { ...shape, note: note.slice(0, 280) };
    });
    publish(next);
  };

  const updateCalloutColor = (calloutIndex: number, nextColor: AnnotationColor) => {
    let seen = -1;
    const next = shapesRef.current.map((shape) => {
      if (shape.kind !== 'callout') return shape;
      seen += 1;
      if (seen !== calloutIndex) return shape;
      return { ...shape, color: nextColor };
    });
    publish(next);
  };

  const selectColor = (swatch: AnnotationColor) => {
    haptic();
    setColor(swatch);
    if (activeCallout != null) {
      updateCalloutColor(activeCallout, swatch);
    }
  };

  const onLayoutBox = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox({ width, height });
  };

  const draftCallout = draft?.kind === 'callout' ? draft : null;
  const activeNote =
    activeCallout != null ? callouts[activeCallout]?.shape.note ?? '' : '';

  return (
    <View style={styles.root}>
      <View
        collapsable={false}
        onLayout={onLayoutBox}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={begin}
        onResponderMove={move}
        onResponderRelease={end}
        onResponderTerminate={end}
        style={styles.canvas}
        accessibilityLabel={t('photoAnnotate.canvasA11y')}
      >
        {rect ? (
          <View
            style={{
              position: 'absolute',
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
              borderRadius: 18,
              overflow: 'hidden',
            }}
          >
            <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="fill" />
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <PhotoAnnotationShapes
                annotations={{ version: 1, shapes }}
                draft={draft}
                width={rect.width}
                height={rect.height}
              />
            </View>

            {stageBadge ? (
              <View style={styles.stageBadge} pointerEvents="none">
                <View style={styles.stageDot} />
                <Text variant="caption" color="#FFFFFF" style={styles.stageBadgeText}>
                  {stageBadge}
                </Text>
              </View>
            ) : null}

            {callouts.map((item, index) => {
              const focused = activeCallout === index;
              const labelColor = annotationLabelColor(item.shape.color);
              return (
                <Pressable
                  key={`callout-${index}`}
                  onPress={() => {
                    haptic();
                    setActiveCallout(index);
                    setColor(item.shape.color);
                    setTool('callout');
                    requestAnimationFrame(() => calloutInputRef.current?.focus());
                  }}
                  style={[
                    styles.calloutPill,
                    {
                      left: item.shape.at.x * rect.width,
                      top: item.shape.at.y * rect.height,
                      backgroundColor: item.shape.color,
                      borderColor: focused ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
                      transform: [{ translateX: -12 }, { translateY: -18 }],
                    },
                  ]}
                >
                  <Ionicons name="checkmark" size={14} color={labelColor} />
                  <Text variant="caption" color={labelColor} style={styles.calloutPillText} numberOfLines={2}>
                    {item.shape.note.trim() || t('photoAnnotate.cardPlaceholder')}
                  </Text>
                </Pressable>
              );
            })}

            {draftCallout ? (
              <View
                pointerEvents="none"
                style={[
                  styles.calloutPill,
                  {
                    left: draftCallout.at.x * rect.width,
                    top: draftCallout.at.y * rect.height,
                    backgroundColor: draftCallout.color,
                    transform: [{ translateX: -12 }, { translateY: -18 }],
                    opacity: 0.85,
                  },
                ]}
              >
                <Ionicons name="checkmark" size={14} color={annotationLabelColor(draftCallout.color)} />
                <Text variant="caption" color={annotationLabelColor(draftCallout.color)} style={styles.calloutPillText}>
                  {t('photoAnnotate.cardPlaceholder')}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {activeCallout != null ? (
        <View style={[styles.noteRow, { paddingHorizontal: spacing.lg }]}>
          <TextInput
            ref={calloutInputRef}
            value={activeNote}
            onChangeText={(value) => updateCalloutNote(activeCallout, value)}
            placeholder={t('photoAnnotate.cardPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            style={[styles.noteInput, { color: colors.textPrimary, borderColor: colors.border }]}
            returnKeyType="done"
            onSubmitEditing={() => setActiveCallout(null)}
          />
        </View>
      ) : null}

      <View style={[styles.captionRow, { paddingHorizontal: spacing.lg }]}>
        {onCaptionChange ? (
          <TextInput
            value={caption ?? ''}
            onChangeText={onCaptionChange}
            placeholder={t('photoAnnotate.captionPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            style={[styles.captionInput, { color: colors.textPrimary }]}
          />
        ) : (
          <Text variant="bodyMedium" color={colors.textPrimary} style={styles.captionText} numberOfLines={1}>
            {caption?.trim() || t('photos.captionEmpty')}
          </Text>
        )}
        <View style={styles.swatches}>
          {ANNOTATION_COLORS.map((swatch) => {
            const selected = color === swatch;
            return (
              <Pressable
                key={swatch}
                accessibilityRole="button"
                accessibilityLabel={t('photoAnnotate.colorA11y', { color: swatch })}
                accessibilityState={{ selected }}
                onPress={() => selectColor(swatch)}
                style={styles.swatchHit}
              >
                <View
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: swatch,
                      borderColor: swatch === '#FFFFFF' ? colors.borderStrong : swatch,
                    },
                    selected ? styles.swatchSelected : null,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.toolbarWrap, { paddingHorizontal: spacing.lg }]}>
        <View style={[styles.toolbar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {ANNOTATION_TOOLS.map((item) => {
            const selected = tool === item;
            const meta = TOOL_META[item];
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={t(meta.labelKey)}
                accessibilityState={{ selected }}
                onPress={() => {
                  haptic();
                  setTool(item);
                }}
                style={[styles.tool, selected ? { backgroundColor: colors.accentSoft } : null]}
              >
                <Ionicons
                  name={meta.icon}
                  size={21}
                  color={selected ? colors.accentPressed : colors.textSecondary}
                />
                <Text
                  variant="caption"
                  color={selected ? colors.accentPressed : colors.textSecondary}
                  style={styles.toolLabel}
                >
                  {t(meta.labelKey)}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('photoAnnotate.undoA11y')}
            disabled={shapes.length === 0}
            onPress={undo}
            style={[styles.tool, shapes.length === 0 ? styles.toolDisabled : null]}
          >
            <Ionicons name={TOOL_META.undo.icon} size={21} color={colors.textSecondary} />
            <Text variant="caption" color={colors.textSecondary} style={styles.toolLabel}>
              {t('photoAnnotate.undoA11y')}
            </Text>
          </Pressable>

          {onDone ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('photoAnnotate.done')}
              disabled={doneLoading}
              onPress={() => {
                haptic();
                onDone();
              }}
              style={[styles.tool, styles.toolDone, { backgroundColor: colors.accent }]}
            >
              <Ionicons name={TOOL_META.done.icon} size={21} color={colors.accentOnAccent} />
              <Text variant="caption" color={colors.accentOnAccent} style={styles.toolLabelDone}>
                {t('photoAnnotate.done')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 12,
  },
  canvas: {
    flex: 1,
    minHeight: 220,
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E9EDEA',
  },
  stageBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(16,19,16,0.72)',
  },
  stageDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF5A36',
  },
  stageBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  calloutPill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 220,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 2,
    shadowColor: '#101310',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  calloutPillText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  noteRow: {
    marginTop: -4,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 30,
  },
  captionInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  captionText: {
    flex: 1,
    fontSize: 13,
  },
  swatches: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swatchHit: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  swatchSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#FFB020',
  },
  toolbarWrap: {
    paddingBottom: 4,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 20,
    padding: 6,
    shadowColor: '#101310',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  tool: {
    width: 50,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  toolDone: {},
  toolDisabled: {
    opacity: 0.35,
  },
  toolLabel: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  toolLabelDone: {
    fontSize: 10.5,
    fontWeight: '600',
  },
});

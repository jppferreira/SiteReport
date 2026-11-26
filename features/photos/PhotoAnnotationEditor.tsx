import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, ToggleRow } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import {
  ANNOTATION_COLORS,
  ANNOTATION_STROKE_SIZES,
  ANNOTATION_TOOLS,
  AnnotationColor,
  AnnotationPoint,
  AnnotationShape,
  AnnotationStrokeSize,
  AnnotationTool,
  clampPoint,
  emptyAnnotations,
  HighlightMode,
  PhotoAnnotations,
} from '@/models';
import { useTheme } from '@/theme';

import {
  autoPlaceLabel,
  boundsForShape,
  expandBoundsForMove,
  handlesForShape,
  hitTestHandle,
  hitTestMoveTarget,
  hitTestShape,
  moveShape,
  type MarkupHandleId,
  resizeShape,
} from './photoMarkupHitTest';
import { PhotoAnnotationShapes } from './PhotoAnnotationShapes';

type DragSession =
  | { kind: 'draw' }
  | { kind: 'move'; index: number; origin: AnnotationPoint; start: AnnotationShape; dirty: boolean }
  | { kind: 'handle'; index: number; handleId: MarkupHandleId; dirty: boolean };

const HANDLE_SIZE = 24;
const SELECTION_PAD = 12;
const HANDLE_COLOR = '#1FA84A';

const LAST_TOOL_KEY = 'tradesreport.photoMarkup.lastTool';

export type JobMeasureOption = {
  id: string;
  name: string;
  label: string;
};

type PhotoAnnotationEditorProps = {
  uri: string;
  photoWidth: number;
  photoHeight: number;
  initial: PhotoAnnotations | null;
  onChange: (annotations: PhotoAnnotations) => void;
  stageBadge?: string | null;
  onSave?: () => void;
  saveLoading?: boolean;
  onClose?: () => void;
  onRetake?: () => void;
  jobMeasurements?: JobMeasureOption[];
};

type Draft = AnnotationShape;

const COLOR_NAME_KEY: Record<AnnotationColor, string> = {
  '#FF5A36': 'photoAnnotate.colorOrange',
  '#FFB020': 'photoAnnotate.colorYellow',
  '#1FA84A': 'photoAnnotate.colorGreen',
  '#FFFFFF': 'photoAnnotate.colorWhite',
  '#121412': 'photoAnnotate.colorBlack',
};

const SIZE_LABEL_KEY: Record<AnnotationStrokeSize, string> = {
  thin: 'photoAnnotate.sizeThin',
  medium: 'photoAnnotate.sizeMedium',
  thick: 'photoAnnotate.sizeThick',
};

const TOOL_META: Record<AnnotationTool, { icon: keyof typeof Ionicons.glyphMap; labelKey: string }> = {
  arrow: { icon: 'arrow-up', labelKey: 'photoAnnotate.toolArrowA11y' },
  callout: { icon: 'text', labelKey: 'photoAnnotate.toolCalloutA11y' },
  dimension: { icon: 'resize-outline', labelKey: 'photoAnnotate.toolMeasureA11y' },
  highlight: { icon: 'ellipse-outline', labelKey: 'photoAnnotate.toolHighlightA11y' },
  pen: { icon: 'pencil', labelKey: 'photoAnnotate.toolDrawA11y' },
};

const QUICK_PHRASES = [
  'photoAnnotate.quickPhraseDamage',
  'photoAnnotate.quickPhraseReplace',
  'photoAnnotate.quickPhraseFitted',
  'photoAnnotate.quickPhraseLeak',
  'photoAnnotate.quickPhraseCheck',
] as const;

const HINT_KEY: Partial<Record<AnnotationTool, string>> = {
  arrow: 'photoAnnotate.hintArrow',
  callout: 'photoAnnotate.hintLabel',
  dimension: 'photoAnnotate.hintMeasure',
  highlight: 'photoAnnotate.hintHighlight',
  pen: 'photoAnnotate.hintDraw',
};

function haptic() {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
}

/**
 * Full-bleed photo markup editor matching Figma Annotation Redesign.
 * Marks bake into the PDF via annotationsToSvgMarkup.
 */
export function PhotoAnnotationEditor({
  uri,
  photoWidth,
  photoHeight,
  initial,
  onChange,
  stageBadge,
  onSave,
  saveLoading = false,
  onClose,
  onRetake,
  jobMeasurements = [],
}: PhotoAnnotationEditorProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const [box, setBox] = useState({ width: 0, height: 0 });
  const [shapes, setShapes] = useState<AnnotationShape[]>(initial?.shapes ?? []);
  const [redoStack, setRedoStack] = useState<AnnotationShape[][]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tool, setTool] = useState<AnnotationTool | null>(null);
  const [highlightMode, setHighlightMode] = useState<HighlightMode>('circle');
  const [color, setColor] = useState<AnnotationColor>(ANNOTATION_COLORS[0]);
  const [strokeSize, setStrokeSize] = useState<AnnotationStrokeSize>('medium');
  const [outline, setOutline] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);
  const [labelIndex, setLabelIndex] = useState<number | null>(null);
  const [measureDraftIndex, setMeasureDraftIndex] = useState<number | null>(null);
  const [measureUnit, setMeasureUnit] = useState<'mm' | 'cm' | 'm'>('mm');
  const [measureValue, setMeasureValue] = useState('900');
  const [hintTool, setHintTool] = useState<AnnotationTool | null>(null);
  const [seenHints, setSeenHints] = useState<Partial<Record<AnnotationTool, boolean>>>({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [zoomLabel, setZoomLabel] = useState(1);

  const shapesRef = useRef(shapes);
  const draftRef = useRef<Draft | null>(null);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const strokeRef = useRef(strokeSize);
  const outlineRef = useRef(outline);
  const highlightModeRef = useRef(highlightMode);
  const selectedIndexRef = useRef(selectedIndex);
  const dragRef = useRef<DragSession | null>(null);
  const labelInputRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const canvasWindowRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const zoomRef = useRef({ scale: 1, tx: 0, ty: 0 });
  shapesRef.current = shapes;
  draftRef.current = draft;
  toolRef.current = tool;
  colorRef.current = color;
  strokeRef.current = strokeSize;
  outlineRef.current = outline;
  highlightModeRef.current = highlightMode;
  selectedIndexRef.current = selectedIndex;

  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);

  useEffect(() => {
    AsyncStorage.getItem(LAST_TOOL_KEY)
      .then((raw) => {
        if (raw && (ANNOTATION_TOOLS as readonly string[]).includes(raw)) {
          // Remembered, but still idle until the user taps a tool (Figma: nothing on first open).
          // Store only — do not auto-select, so stray thumb marks are avoided.
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const cover = useMemo(() => {
    if (box.width <= 0 || box.height <= 0 || photoWidth <= 0 || photoHeight <= 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    const scaleCover = Math.max(box.width / photoWidth, box.height / photoHeight);
    const width = photoWidth * scaleCover;
    const height = photoHeight * scaleCover;
    return { x: (box.width - width) / 2, y: (box.height - height) / 2, width, height };
  }, [box.height, box.width, photoHeight, photoWidth]);
  const coverRef = useRef(cover);
  coverRef.current = cover;

  const publish = useCallback(
    (next: AnnotationShape[], { pushUndo = true, keepSelection }: { pushUndo?: boolean; keepSelection?: number | null } = {}) => {
      if (pushUndo) setRedoStack([]);
      shapesRef.current = next;
      setShapes(next);
      if (keepSelection !== undefined) {
        setSelectedIndex(keepSelection);
      } else {
        setSelectedIndex(null);
      }
      onChange(next.length === 0 ? emptyAnnotations() : { version: 1, shapes: next });
    },
    [onChange]
  );

  const pointFromLocation = useCallback((locationX: number, locationY: number): AnnotationPoint | null => {
    const fitted = coverRef.current;
    if (!fitted || fitted.width <= 0 || fitted.height <= 0) return null;
    return clampPoint({
      x: (locationX - fitted.x) / fitted.width,
      y: (locationY - fitted.y) / fitted.height,
    });
  }, []);

  /** Inverse of the canvas pinch/pan so marks land under the finger when zoomed. */
  const pointFromTouch = useCallback(
    (pageX: number, pageY: number): AnnotationPoint | null => {
      const { scale: zoomScale, tx: zoomTx, ty: zoomTy } = zoomRef.current;
      const { x: wx, y: wy, width: bw, height: bh } = canvasWindowRef.current;
      if (bw <= 0 || bh <= 0) return null;
      const cx = wx + bw / 2;
      const cy = wy + bh / 2;
      const localX = (pageX - cx - zoomTx) / zoomScale + bw / 2;
      const localY = (pageY - cy - zoomTy) / zoomScale + bh / 2;
      return pointFromLocation(localX, localY);
    },
    [pointFromLocation]
  );

  const placeLabel = useCallback(
    (point: AnnotationPoint) => {
      const at = autoPlaceLabel(point);
      const shape: AnnotationShape = {
        kind: 'callout',
        color: colorRef.current,
        at,
        anchor: point,
        note: '',
        outline: outlineRef.current,
      };
      const next = [...shapesRef.current, shape];
      publish(next);
      const index = next.length - 1;
      setLabelIndex(index);
      haptic();
      requestAnimationFrame(() => {
        setTimeout(() => labelInputRef.current?.focus(), 80);
      });
    },
    [publish]
  );

  /** Enter select/move (or handle) mode for an existing mark; clears the draw tool. */
  const beginSelectAt = useCallback((point: AnnotationPoint, index: number) => {
    const shape = shapesRef.current[index];
    if (!shape) return;
    if (toolRef.current) {
      toolRef.current = null;
      setTool(null);
    }
    setSelectedIndex(index);
    selectedIndexRef.current = index;
    haptic();

    const handleId = hitTestHandle(shape, point);
    if (handleId) {
      dragRef.current = { kind: 'handle', index, handleId, dirty: false };
      return;
    }
    dragRef.current = {
      kind: 'move',
      index,
      origin: point,
      start: shape,
      dirty: false,
    };
  }, []);

  const beginAt = useCallback(
    (pageX: number, pageY: number) => {
      const selected = toolRef.current;
      const point = pointFromTouch(pageX, pageY);
      if (!point) return;

      // Already-selected mark: handles and fat move target win over drawing.
      const currentSelected = selectedIndexRef.current;
      if (currentSelected != null) {
        const selectedShape = shapesRef.current[currentSelected];
        if (selectedShape) {
          const handleId = hitTestHandle(selectedShape, point);
          if (handleId) {
            if (toolRef.current) {
              toolRef.current = null;
              setTool(null);
            }
            dragRef.current = { kind: 'handle', index: currentSelected, handleId, dirty: false };
            haptic();
            return;
          }
          if (hitTestMoveTarget(selectedShape, point)) {
            if (toolRef.current) {
              toolRef.current = null;
              setTool(null);
            }
            dragRef.current = {
              kind: 'move',
              index: currentSelected,
              origin: point,
              start: selectedShape,
              dirty: false,
            };
            return;
          }
        }
      }

      // Prefer tapping an existing mark over drawing a new one on top of it —
      // otherwise delete / drag is unreachable while a tool stays selected.
      const hit = hitTestShape(shapesRef.current, point);
      if (hit != null) {
        beginSelectAt(point, hit);
        return;
      }

      if (!selected) {
        setSelectedIndex(null);
        selectedIndexRef.current = null;
        dragRef.current = null;
        return;
      }

      if (selected === 'callout') {
        placeLabel(point);
        return;
      }

      const width = ANNOTATION_STROKE_SIZES[strokeRef.current];
      const outlineFlag = outlineRef.current;
      let next: Draft;
      if (selected === 'pen') {
        next = { kind: 'pen', color: colorRef.current, width, points: [point], outline: outlineFlag };
      } else if (selected === 'dimension') {
        next = {
          kind: 'dimension',
          color: colorRef.current,
          width,
          from: point,
          to: point,
          label: '',
          outline: outlineFlag,
        };
      } else if (selected === 'highlight') {
        const mode = highlightModeRef.current;
        if (mode === 'circle') {
          next = { kind: 'circle', color: colorRef.current, width, from: point, to: point, outline: outlineFlag };
        } else if (mode === 'box') {
          next = { kind: 'rect', color: colorRef.current, width, from: point, to: point, outline: outlineFlag };
        } else {
          next = { kind: 'highlight', color: colorRef.current, width, from: point, to: point, outline: outlineFlag };
        }
      } else {
        next = { kind: 'arrow', color: colorRef.current, width, from: point, to: point, outline: outlineFlag };
      }
      dragRef.current = { kind: 'draw' };
      draftRef.current = next;
      setDraft(next);
      setSelectedIndex(null);
      selectedIndexRef.current = null;
    },
    [beginSelectAt, placeLabel, pointFromTouch]
  );

  const moveAt = useCallback(
    (pageX: number, pageY: number) => {
      const point = pointFromTouch(pageX, pageY);
      if (!point) return;

      const session = dragRef.current;
      if (session?.kind === 'move') {
        const dx = point.x - session.origin.x;
        const dy = point.y - session.origin.y;
        if (Math.hypot(dx, dy) < 0.002 && !session.dirty) return;
        const moved = moveShape(session.start, dx, dy);
        const next = shapesRef.current.map((shape, i) => (i === session.index ? moved : shape));
        shapesRef.current = next;
        dragRef.current = { ...session, dirty: true };
        setShapes(next);
        onChange(next.length === 0 ? emptyAnnotations() : { version: 1, shapes: next });
        return;
      }
      if (session?.kind === 'handle') {
        const current = shapesRef.current[session.index];
        if (!current) return;
        const resized = resizeShape(current, session.handleId, point);
        const next = shapesRef.current.map((shape, i) => (i === session.index ? resized : shape));
        shapesRef.current = next;
        dragRef.current = { ...session, dirty: true };
        setShapes(next);
        onChange(next.length === 0 ? emptyAnnotations() : { version: 1, shapes: next });
        return;
      }

      const current = draftRef.current;
      if (!current) return;
      let next: Draft;
      if (current.kind === 'pen') {
        const last = current.points[current.points.length - 1];
        if (last && Math.abs(last.x - point.x) < 0.002 && Math.abs(last.y - point.y) < 0.002) return;
        next = { ...current, points: [...current.points, point] };
      } else if (current.kind === 'callout') {
        return;
      } else {
        next = { ...current, to: point };
      }
      draftRef.current = next;
      setDraft(next);
    },
    [onChange, pointFromTouch]
  );

  const endDraw = useCallback(() => {
    const session = dragRef.current;
    dragRef.current = null;

    if (session?.kind === 'move' || session?.kind === 'handle') {
      if (session.dirty) {
        publish(shapesRef.current, { keepSelection: session.index });
      } else {
        setSelectedIndex(session.index);
      }
      return;
    }

    const current = draftRef.current;
    draftRef.current = null;
    setDraft(null);
    if (!current) return;
    if (current.kind === 'pen' && current.points.length === 0) return;
    if (
      (current.kind === 'arrow' ||
        current.kind === 'circle' ||
        current.kind === 'rect' ||
        current.kind === 'highlight' ||
        current.kind === 'dimension') &&
      Math.hypot(current.to.x - current.from.x, current.to.y - current.from.y) < 0.012
    ) {
      return;
    }
    const next = [...shapesRef.current, current];
    publish(next);
    haptic();
    if (current.kind === 'dimension') {
      setMeasureDraftIndex(next.length - 1);
      setMeasureValue('900');
    } else {
      setSelectedIndex(next.length - 1);
    }
  }, [publish]);

  // Reliable touch path — page coords + inverse zoom so drawing stays under the finger.
  const onGrant = (event: GestureResponderEvent) => {
    beginAt(event.nativeEvent.pageX, event.nativeEvent.pageY);
  };
  const onMove = (event: GestureResponderEvent) => {
    moveAt(event.nativeEvent.pageX, event.nativeEvent.pageY);
  };
  const onRelease = () => {
    endDraw();
  };

  const syncZoom = useCallback((nextScale: number, nextTx: number, nextTy: number) => {
    zoomRef.current = { scale: nextScale, tx: nextTx, ty: nextTy };
    setZoomLabel(Math.round(nextScale * 10) / 10);
  }, []);

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          startScale.value = scale.value;
        })
        .onUpdate((event) => {
          scale.value = Math.min(4, Math.max(1, startScale.value * event.scale));
          runOnJS(syncZoom)(scale.value, tx.value, ty.value);
        })
        .onEnd(() => {
          runOnJS(syncZoom)(scale.value, tx.value, ty.value);
        }),
    [scale, startScale, syncZoom, tx, ty]
  );

  const panZoom = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(2)
        .onStart(() => {
          startTx.value = tx.value;
          startTy.value = ty.value;
        })
        .onUpdate((event) => {
          tx.value = startTx.value + event.translationX;
          ty.value = startTy.value + event.translationY;
          runOnJS(syncZoom)(scale.value, tx.value, ty.value);
        })
        .onEnd(() => {
          runOnJS(syncZoom)(scale.value, tx.value, ty.value);
        }),
    [scale, startTx, startTy, syncZoom, tx, ty]
  );

  // Pinch / two-finger pan take priority; Gesture.Native() lets one-finger responders draw/tap.
  const zoomGesture = useMemo(
    () => Gesture.Exclusive(pinch, panZoom, Gesture.Native()),
    [panZoom, pinch]
  );

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const undo = () => {
    if (shapesRef.current.length === 0) return;
    haptic();
    const prev = shapesRef.current;
    setRedoStack((stack) => [...stack, prev]);
    publish(prev.slice(0, -1), { pushUndo: false });
    setLabelIndex(null);
    setMeasureDraftIndex(null);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    haptic();
    const stack = [...redoStack];
    const restored = stack.pop()!;
    setRedoStack(stack);
    publish(restored, { pushUndo: false });
  };

  const selectTool = (next: AnnotationTool) => {
    haptic();
    setTool((current) => {
      const value = current === next ? null : next;
      if (value) AsyncStorage.setItem(LAST_TOOL_KEY, value).catch(() => undefined);
      return value;
    });
    setSelectedIndex(null);
    selectedIndexRef.current = null;
    dragRef.current = null;
    if (!seenHints[next]) {
      setHintTool(next);
      setSeenHints((prev) => ({ ...prev, [next]: true }));
      setTimeout(() => setHintTool((active) => (active === next ? null : active)), 2200);
    }
  };

  const updateLabelNote = (index: number, note: string) => {
    const next = shapesRef.current.map((shape, i) =>
      i === index && shape.kind === 'callout' ? { ...shape, note: note.slice(0, 280) } : shape
    );
    shapesRef.current = next;
    setShapes(next);
    onChange(next.length === 0 ? emptyAnnotations() : { version: 1, shapes: next });
  };

  const applyMeasureLabel = (labelOverride?: string) => {
    if (measureDraftIndex == null) return;
    let label = labelOverride?.trim();
    if (!label) {
      const raw = measureValue.trim().replace(/,/g, '.');
      const num = Number(raw);
      label = Number.isFinite(num) ? `${Math.round(num * 10) / 10} ${measureUnit}` : `${raw} ${measureUnit}`;
    }
    const next = shapesRef.current.map((shape, i) =>
      i === measureDraftIndex && shape.kind === 'dimension' ? { ...shape, label } : shape
    );
    publish(next);
    setMeasureDraftIndex(null);
  };

  const pickArMeasurement = (item: JobMeasureOption) => {
    const unitMatch = item.label.match(/(mm|cm|m)\s*$/i);
    if (unitMatch) {
      const unit = unitMatch[1]!.toLowerCase() as 'mm' | 'cm' | 'm';
      setMeasureUnit(unit);
    }
    setMeasureValue(item.label.replace(/\s*(mm|cm|m)\s*$/i, '').trim());
    haptic();
    applyMeasureLabel(item.label);
  };

  const deleteSelected = () => {
    if (selectedIndex == null) return;
    haptic();
    const next = shapesRef.current.filter((_, i) => i !== selectedIndex);
    publish(next, { keepSelection: null });
    selectedIndexRef.current = null;
    dragRef.current = null;
  };

  const copySelected = () => {
    if (selectedIndex == null) return;
    const shape = shapesRef.current[selectedIndex];
    if (!shape) return;
    haptic();
    const offset = 0.04;
    let cloned: AnnotationShape;
    if (shape.kind === 'pen') {
      cloned = {
        ...shape,
        points: shape.points.map((point) => clampPoint({ x: point.x + offset, y: point.y + offset })),
      };
    } else if (shape.kind === 'callout') {
      cloned = {
        ...shape,
        at: clampPoint({ x: shape.at.x + offset, y: shape.at.y + offset }),
        anchor: shape.anchor
          ? clampPoint({ x: shape.anchor.x + offset, y: shape.anchor.y + offset })
          : undefined,
      };
    } else if ('from' in shape && 'to' in shape) {
      cloned = {
        ...shape,
        from: clampPoint({ x: shape.from.x + offset, y: shape.from.y + offset }),
        to: clampPoint({ x: shape.to.x + offset, y: shape.to.y + offset }),
      };
    } else {
      return;
    }
    const next = [...shapesRef.current, cloned];
    publish(next, { keepSelection: next.length - 1 });
  };

  const editSelected = () => {
    if (selectedIndex == null) return;
    const shape = shapesRef.current[selectedIndex];
    if (!shape) return;
    if (shape.kind === 'callout') {
      setLabelIndex(selectedIndex);
      setColor(shape.color);
      requestAnimationFrame(() => labelInputRef.current?.focus());
      return;
    }
    if (shape.kind === 'dimension') {
      setMeasureDraftIndex(selectedIndex);
      const match = shape.label.match(/^([\d.]+)/);
      if (match) setMeasureValue(match[1]!);
      return;
    }
    setStyleOpen(true);
  };

  const applyStyleToSelectedOrDefaults = (patch: {
    color?: AnnotationColor;
    strokeSize?: AnnotationStrokeSize;
    outline?: boolean;
  }) => {
    if (patch.color) setColor(patch.color);
    if (patch.strokeSize) setStrokeSize(patch.strokeSize);
    if (patch.outline !== undefined) setOutline(patch.outline);
    if (selectedIndex == null) return;
    const width = ANNOTATION_STROKE_SIZES[patch.strokeSize ?? strokeSize];
    const next = shapesRef.current.map((shape, i) => {
      if (i !== selectedIndex) return shape;
      const withColor = patch.color ? { ...shape, color: patch.color } : shape;
      const withOutline = patch.outline !== undefined ? { ...withColor, outline: patch.outline } : withColor;
      if ('width' in withOutline && patch.strokeSize) return { ...withOutline, width };
      return withOutline;
    });
    publish(next, { pushUndo: false, keepSelection: selectedIndex });
  };

  const activeLabel =
    labelIndex != null && shapes[labelIndex]?.kind === 'callout' ? shapes[labelIndex] : null;
  const colorName = t(COLOR_NAME_KEY[color]);
  const sizeName = t(SIZE_LABEL_KEY[strokeSize]);
  const selectedShape = selectedIndex != null ? shapes[selectedIndex] : null;
  const selectedBounds =
    selectedShape && labelIndex == null && measureDraftIndex == null
      ? expandBoundsForMove(boundsForShape(selectedShape))
      : null;
  const selectedHandles =
    selectedShape && labelIndex == null && measureDraftIndex == null
      ? handlesForShape(selectedShape)
      : [];

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('photoAnnotate.closeA11y')}
          onPress={onClose}
          style={styles.glassRound}
        >
          <Ionicons name="close" size={22} color="#121412" />
        </Pressable>
        {stageBadge ? (
          <View style={styles.stagePill}>
            <View style={styles.stageDot} />
            <Text variant="caption" color="#121412" style={styles.stageText} numberOfLines={1}>
              {stageBadge}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <View style={styles.topRight}>
          {onRetake ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('photoAnnotate.retake')}
              onPress={onRetake}
              style={styles.glassRound}
            >
              <Ionicons name="camera-reverse-outline" size={20} color="#121412" />
            </Pressable>
          ) : null}
          {onSave ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('photoAnnotate.save')}
              disabled={saveLoading}
              onPress={() => {
                haptic();
                onSave();
              }}
              style={[styles.savePill, { backgroundColor: colors.accent }]}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text variant="label" color="#FFFFFF">
                {t('photoAnnotate.save')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View
        style={styles.canvas}
        onLayout={(event: LayoutChangeEvent) => {
          const { width, height } = event.nativeEvent.layout;
          setBox({ width, height });
          const target = event.target as unknown as {
            measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
          };
          target.measureInWindow?.((x, y, w, h) => {
            canvasWindowRef.current = { x, y, width: w, height: h };
          });
        }}
        accessibilityLabel={t('photoAnnotate.canvasA11y')}
      >
        <GestureDetector gesture={zoomGesture}>
          <Animated.View style={[styles.canvasInner, imageStyle]}>
            <View
              collapsable={false}
              style={StyleSheet.absoluteFill}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => toolRef.current !== 'callout'}
              onResponderTerminationRequest={() => false}
              onResponderGrant={onGrant}
              onResponderMove={onMove}
              onResponderRelease={onRelease}
              onResponderTerminate={onRelease}
            >
              {cover.width > 0 ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: cover.x,
                    top: cover.y,
                    width: cover.width,
                    height: cover.height,
                  }}
                >
                  <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="fill" />
                  <PhotoAnnotationShapes
                    annotations={{ version: 1, shapes }}
                    draft={draft}
                    width={cover.width}
                    height={cover.height}
                  />
                  {selectedBounds ? (
                    <View
                      style={[
                        styles.selectionBox,
                        {
                          left: selectedBounds.minX * cover.width - SELECTION_PAD,
                          top: selectedBounds.minY * cover.height - SELECTION_PAD,
                          width:
                            (selectedBounds.maxX - selectedBounds.minX) * cover.width + SELECTION_PAD * 2,
                          height:
                            (selectedBounds.maxY - selectedBounds.minY) * cover.height + SELECTION_PAD * 2,
                        },
                      ]}
                    />
                  ) : null}
                  {selectedHandles.map((handle) => (
                    <View
                      key={handle.id}
                      style={[
                        styles.handle,
                        {
                          left: handle.point.x * cover.width - HANDLE_SIZE / 2,
                          top: handle.point.y * cover.height - HANDLE_SIZE / 2,
                        },
                      ]}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          </Animated.View>
        </GestureDetector>

        {hintTool && HINT_KEY[hintTool] ? (
          <View style={styles.hintPill} pointerEvents="none">
            <Text variant="caption" color="#FFFFFF">
              {t(HINT_KEY[hintTool]!)}
            </Text>
          </View>
        ) : null}

        {selectedShape && labelIndex == null && measureDraftIndex == null ? (
          <View style={styles.selectionBar} pointerEvents="box-none">
            <View style={styles.selectionBarInner}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('photoAnnotate.editMark')}
                onPress={editSelected}
                style={styles.selectionIconBtn}
              >
                <Ionicons name="pencil" size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('photoAnnotate.colourMark')}
                onPress={() => setStyleOpen(true)}
                style={styles.selectionIconBtn}
              >
                <Ionicons name="color-palette-outline" size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('photoAnnotate.copyMark')}
                onPress={copySelected}
                style={styles.selectionIconBtn}
              >
                <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('photoAnnotate.deleteMark')}
                onPress={deleteSelected}
                style={styles.selectionIconBtn}
              >
                <Ionicons name="trash-outline" size={18} color="#FF8A80" />
              </Pressable>
            </View>
            <View style={styles.dragHintPill}>
              <Text variant="caption" color="#FFFFFF">
                {t('photoAnnotate.dragHint')}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.floatRow, { bottom: 118 + insets.bottom }]} pointerEvents="box-none">
          <View style={styles.undoRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('photoAnnotate.undoA11y')}
              disabled={shapes.length === 0}
              onPress={undo}
              style={[styles.glassRound, shapes.length === 0 && styles.disabled]}
            >
              <Ionicons name="arrow-undo" size={18} color="#121412" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('photoAnnotate.redoA11y')}
              disabled={redoStack.length === 0}
              onPress={redo}
              style={[styles.glassRound, redoStack.length === 0 && styles.disabled]}
            >
              <Ionicons name="arrow-redo" size={18} color="#121412" />
            </Pressable>
          </View>
          {zoomLabel > 1.05 ? (
            <View style={styles.zoomChip}>
              <Text variant="caption" color="#FFFFFF">
                {zoomLabel}×
              </Text>
            </View>
          ) : (
            <View />
          )}
        </View>
      </View>

      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.dockTop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('photoAnnotate.styleChipA11y')}
            onPress={() => setStyleOpen(true)}
            style={styles.styleChip}
          >
            <View
              style={[
                styles.styleSwatch,
                { backgroundColor: color, borderColor: color === '#FFFFFF' ? '#D0D5D0' : color },
              ]}
            />
            <View
              style={[
                styles.styleStroke,
                {
                  height: strokeSize === 'thin' ? 2 : strokeSize === 'thick' ? 6 : 3.5,
                  backgroundColor: '#121412',
                },
              ]}
            />
            <Text variant="caption" color="#121412" style={styles.styleChipText} numberOfLines={1}>
              {t('photoAnnotate.styleChip', { color: colorName, size: sizeName })}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#6B726B" />
          </Pressable>
          <Text variant="caption" color="#8A918A">
            {tool ? t(HINT_KEY[tool] ?? 'photoAnnotate.tapMarkHint') : t('photoAnnotate.tapMarkHint')}
          </Text>
        </View>

        {tool === 'highlight' ? (
          <View style={styles.highlightModes}>
            {(['circle', 'box', 'fill'] as HighlightMode[]).map((mode) => {
              const selected = highlightMode === mode;
              const label =
                mode === 'circle'
                  ? t('photoAnnotate.highlightCircle')
                  : mode === 'box'
                    ? t('photoAnnotate.highlightBox')
                    : t('photoAnnotate.highlightFill');
              return (
                <Pressable
                  key={mode}
                  onPress={() => {
                    haptic();
                    setHighlightMode(mode);
                  }}
                  style={[styles.highlightMode, selected && { backgroundColor: colors.accentSoft }]}
                >
                  <Text variant="caption" color={selected ? colors.accentPressed : '#5C635C'}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.tools}>
          {ANNOTATION_TOOLS.map((item) => {
            const selected = tool === item;
            const meta = TOOL_META[item];
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={t(meta.labelKey)}
                accessibilityState={{ selected }}
                onPress={() => selectTool(item)}
                style={[styles.tool, selected ? { backgroundColor: colors.accentSoft } : null]}
              >
                <Ionicons name={meta.icon} size={22} color={selected ? colors.accentPressed : '#5C635C'} />
                <Text
                  variant="caption"
                  color={selected ? colors.accentPressed : '#5C635C'}
                  style={styles.toolLabel}
                >
                  {t(meta.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Colour & size */}
      <Modal visible={styleOpen} transparent animationType="slide" onRequestClose={() => setStyleOpen(false)}>
        <Pressable style={styles.sheetScrim} onPress={() => setStyleOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHead}>
            <Text variant="h3">{t('photoAnnotate.colorSheetTitle')}</Text>
            <Pressable onPress={() => setStyleOpen(false)}>
              <Text variant="label" color={colors.accent}>
                {t('common.done')}
              </Text>
            </Pressable>
          </View>
          <View style={styles.swatchRow}>
            {ANNOTATION_COLORS.map((swatch) => {
              const selected = color === swatch;
              return (
                <Pressable
                  key={swatch}
                  onPress={() => {
                    haptic();
                    applyStyleToSelectedOrDefaults({ color: swatch });
                  }}
                  style={[
                    styles.bigSwatch,
                    { backgroundColor: swatch, borderColor: swatch === '#FFFFFF' ? '#D0D5D0' : swatch },
                    selected && styles.bigSwatchSelected,
                  ]}
                >
                  {selected ? (
                    <Ionicons
                      name="checkmark"
                      size={22}
                      color={swatch === '#FFFFFF' || swatch === '#FFB020' ? '#121412' : '#FFFFFF'}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.sizeRow}>
            {(['thin', 'medium', 'thick'] as AnnotationStrokeSize[]).map((size) => {
              const selected = strokeSize === size;
              return (
                <Pressable
                  key={size}
                  onPress={() => {
                    haptic();
                    applyStyleToSelectedOrDefaults({ strokeSize: size });
                  }}
                  style={[
                    styles.sizeCard,
                    selected && { backgroundColor: colors.accentSoft, borderColor: colors.accent },
                  ]}
                >
                  <View style={[styles.sizeLine, { height: size === 'thin' ? 2 : size === 'thick' ? 8 : 4 }]} />
                  <Text variant="caption" color={selected ? colors.accentPressed : '#5C635C'}>
                    {t(SIZE_LABEL_KEY[size])}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <ToggleRow
            label={t('photoAnnotate.outlineLabel')}
            description={t('photoAnnotate.outlineDescription')}
            value={outline}
            onValueChange={(value) => {
              haptic();
              applyStyleToSelectedOrDefaults({ outline: value });
            }}
          />
          <Text variant="caption" color="#8A918A" style={{ marginTop: 8 }}>
            {t('photoAnnotate.styleAppliesHint')}
          </Text>
        </View>
      </Modal>

      {/* Label sheet — Figma 03: above keyboard, Done + quick phrases */}
      <Modal
        visible={activeLabel != null}
        transparent
        animationType="fade"
        onRequestClose={() => setLabelIndex(null)}
      >
        <View style={styles.labelModalRoot} pointerEvents="box-none">
          <Pressable style={styles.sheetScrim} onPress={() => setLabelIndex(null)} />
          <View
            style={[
              styles.labelSheet,
              { bottom: keyboardHeight, paddingBottom: keyboardHeight > 0 ? 12 : Math.max(insets.bottom, 12) },
            ]}
          >
            <View style={styles.labelRow}>
              <TextInput
                ref={labelInputRef}
                value={activeLabel?.note ?? ''}
                onChangeText={(value) => {
                  if (labelIndex != null) updateLabelNote(labelIndex, value);
                }}
                placeholder={t('photoAnnotate.cardPlaceholder')}
                placeholderTextColor="#8A918A"
                style={[styles.labelInput, { borderColor: colors.accent }]}
                returnKeyType="done"
                autoFocus
                onSubmitEditing={() => setLabelIndex(null)}
              />
              <Pressable
                onPress={() => setLabelIndex(null)}
                style={[styles.labelDone, { backgroundColor: colors.accent }]}
              >
                <Text variant="label" color="#FFFFFF">
                  {t('photoAnnotate.labelSheetDone')}
                </Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.phraseRow}>
              {QUICK_PHRASES.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => {
                    if (labelIndex == null) return;
                    haptic();
                    updateLabelNote(labelIndex, t(key));
                  }}
                  style={[styles.phraseChip, { backgroundColor: colors.accentSoft }]}
                >
                  <Text variant="caption" color={colors.accentPressed}>
                    {t(key)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Measure sheet */}
      <Modal
        visible={measureDraftIndex != null}
        transparent
        animationType="slide"
        onRequestClose={() => setMeasureDraftIndex(null)}
      >
        <Pressable style={styles.sheetScrim} onPress={() => setMeasureDraftIndex(null)} />
        <View
          style={[
            styles.sheet,
            {
              bottom: keyboardHeight,
              paddingBottom: keyboardHeight > 0 ? 16 : Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.grabber} />
          <View style={styles.sheetHead}>
            <Text variant="h3">{t('photoAnnotate.measureTitle')}</Text>
            <View style={styles.unitToggle}>
              {(['mm', 'cm', 'm'] as const).map((unit) => (
                <Pressable
                  key={unit}
                  onPress={() => setMeasureUnit(unit)}
                  style={[styles.unitBtn, measureUnit === unit && { backgroundColor: colors.accentSoft }]}
                >
                  <Text variant="caption" color={measureUnit === unit ? colors.accentPressed : '#5C635C'}>
                    {t(
                      unit === 'mm'
                        ? 'photoAnnotate.unitMm'
                        : unit === 'cm'
                          ? 'photoAnnotate.unitCm'
                          : 'photoAnnotate.unitM'
                    )}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.measureField}>
            <TextInput
              value={measureValue}
              onChangeText={setMeasureValue}
              keyboardType="decimal-pad"
              style={styles.measureInput}
              autoFocus
            />
            <Text variant="caption" color="#8A918A">
              {t('photoAnnotate.measureTypeHint')}
            </Text>
          </View>
          <Text variant="caption" color="#8A918A" style={styles.arHeading}>
            {t('photoAnnotate.measureFromAr').toUpperCase()}
          </Text>
          {jobMeasurements.length === 0 ? (
            <Text variant="body" color="#8A918A" style={{ marginBottom: 12 }}>
              {t('photoAnnotate.measureEmptyAr')}
            </Text>
          ) : (
            jobMeasurements.map((item) => (
              <Pressable key={item.id} onPress={() => pickArMeasurement(item)} style={styles.arRow}>
                <Text variant="body" color="#121412">
                  {item.name}
                </Text>
                <Text variant="label" color={colors.accentPressed}>
                  {item.label}
                </Text>
              </Pressable>
            ))
          )}
          <Pressable
            onPress={() => {
              haptic();
              applyMeasureLabel();
            }}
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
          >
            <Text variant="label" color="#FFFFFF">
              {t('photoAnnotate.measureAdd')}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#121412' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  glassRound: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  stagePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  stageDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF5A36' },
  stageText: { flex: 1, fontWeight: '600', fontSize: 12.5 },
  savePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  canvas: { flex: 1, overflow: 'hidden' },
  canvasInner: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  hintPill: {
    position: 'absolute',
    alignSelf: 'center',
    top: 110,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(18,20,18,0.78)',
  },
  selectionBar: {
    position: 'absolute',
    alignSelf: 'center',
    top: 110,
    alignItems: 'center',
    gap: 8,
  },
  selectionBarInner: {
    flexDirection: 'row',
    gap: 2,
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(18,20,18,0.88)',
  },
  selectionIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  dragHintPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(18,20,18,0.78)',
  },
  selectionBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: HANDLE_COLOR,
    borderRadius: 8,
  },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: HANDLE_COLOR,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  floatRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  undoRow: { flexDirection: 'row', gap: 8 },
  zoomChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(18,20,18,0.78)',
  },
  disabled: { opacity: 0.4 },
  dock: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  dockTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#F2F4F2',
    maxWidth: '58%',
  },
  styleSwatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 1 },
  styleStroke: { width: 18, borderRadius: 2 },
  styleChipText: { flexShrink: 1, fontWeight: '600' },
  highlightModes: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F2F4F2',
  },
  highlightMode: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  tools: { flexDirection: 'row', justifyContent: 'space-between' },
  tool: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  toolLabel: { fontSize: 11, fontWeight: '600' },
  sheetScrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(16,19,16,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D5DAD5',
    marginBottom: 10,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  swatchRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  bigSwatch: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  bigSwatchSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  sizeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  sizeCard: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E3E8E3',
    backgroundColor: '#FAFBFA',
  },
  sizeLine: { width: 36, borderRadius: 4, backgroundColor: '#121412' },
  labelModalRoot: { flex: 1, justifyContent: 'flex-end' },
  labelSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingTop: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  labelRow: { flexDirection: 'row', gap: 10 },
  labelInput: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F2F4F2',
    color: '#121412',
    fontSize: 16,
    borderWidth: 2,
  },
  labelDone: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phraseRow: { gap: 8, paddingBottom: 4 },
  phraseChip: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitToggle: { flexDirection: 'row', backgroundColor: '#F2F4F2', borderRadius: 12, padding: 3 },
  unitBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  measureField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F2F4F2',
    marginBottom: 16,
  },
  measureInput: { flex: 1, fontSize: 28, fontWeight: '600', color: '#121412' },
  arHeading: { marginBottom: 8, letterSpacing: 0.6, fontWeight: '700' },
  arRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F7F8F7',
    marginBottom: 8,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
});

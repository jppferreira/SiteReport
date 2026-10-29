import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { buildSignatureSvg, isSignatureEmpty, Stroke, strokeToPathData } from './signatureSvg';

export type SignatureCanvasHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  exportSvg: () => string;
};

type SignatureCanvasProps = {
  height?: number;
  onDrawingChange?: (drawing: boolean) => void;
};

/**
 * Finger-drawn signature pad.
 *
 * Uses the RN responder system (not Gesture Handler) so a parent ScrollView
 * cannot steal the touch mid-stroke. Returning false from
 * onResponderTerminationRequest keeps the stroke continuous; without that,
 * each cancelled touch commits as a single point and the pad looks like dots.
 */
export const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(function SignatureCanvas(
  { height = 220, onDrawingChange },
  ref
) {
  const { colors, radius } = useTheme();
  const { t } = useI18n();
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke>([]);
  const [size, setSize] = useState({ width: 0, height });
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke>([]);
  const sizeRef = useRef(size);
  const colorRef = useRef(colors.textPrimary);
  const drawingChangeRef = useRef(onDrawingChange);
  sizeRef.current = size;
  colorRef.current = colors.textPrimary;
  drawingChangeRef.current = onDrawingChange;

  const notifyDrawing = useCallback((drawing: boolean) => {
    drawingChangeRef.current?.(drawing);
  }, []);

  const beginStroke = useCallback(
    (x: number, y: number) => {
      currentRef.current = [{ x, y }];
      setCurrentStroke(currentRef.current);
      notifyDrawing(true);
    },
    [notifyDrawing]
  );

  const extendStroke = useCallback((x: number, y: number) => {
    const prev = currentRef.current;
    if (prev.length === 0) {
      currentRef.current = [{ x, y }];
    } else {
      const last = prev[prev.length - 1]!;
      // Skip near-duplicates so path data stays compact while still looking smooth.
      if (Math.abs(last.x - x) < 0.5 && Math.abs(last.y - y) < 0.5) return;
      currentRef.current = [...prev, { x, y }];
    }
    setCurrentStroke(currentRef.current);
  }, []);

  const endStroke = useCallback(() => {
    const stroke = currentRef.current;
    currentRef.current = [];
    setCurrentStroke([]);
    notifyDrawing(false);
    if (stroke.length === 0) return;
    strokesRef.current = [...strokesRef.current, stroke];
    setStrokes(strokesRef.current);
  }, [notifyDrawing]);

  useImperativeHandle(ref, () => ({
    clear: () => {
      strokesRef.current = [];
      currentRef.current = [];
      setStrokes([]);
      setCurrentStroke([]);
      notifyDrawing(false);
    },
    isEmpty: () => isSignatureEmpty([...strokesRef.current, currentRef.current]),
    exportSvg: () => {
      const pending = currentRef.current;
      const all = pending.length > 0 ? [...strokesRef.current, pending] : strokesRef.current;
      const { width, height: canvasHeight } = sizeRef.current;
      return buildSignatureSvg(all, width, canvasHeight, colorRef.current);
    },
  }), [notifyDrawing]);

  const pointFromEvent = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    return { x: locationX, y: locationY };
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const next = { width: event.nativeEvent.layout.width, height };
    sizeRef.current = next;
    setSize(next);
  };

  return (
    <View
      collapsable={false}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => {
        const { x, y } = pointFromEvent(event);
        beginStroke(x, y);
      }}
      onResponderMove={(event) => {
        const { x, y } = pointFromEvent(event);
        extendStroke(x, y);
      }}
      onResponderRelease={endStroke}
      onResponderTerminate={endStroke}
      style={[
        styles.container,
        { height, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md },
      ]}
      accessibilityLabel={t('signature.canvasA11y')}
      accessibilityHint={t('signature.canvasHint')}
    >
      {size.width > 0 ? (
        <Svg width={size.width} height={size.height} pointerEvents="none">
          {strokes.map((stroke, index) => (
            <Path
              key={index}
              d={strokeToPathData(stroke)}
              stroke={colors.textPrimary}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentStroke.length > 0 ? (
            <Path
              d={strokeToPathData(currentStroke)}
              stroke={colors.textPrimary}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
  },
});

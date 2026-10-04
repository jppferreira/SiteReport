import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

import { buildSignatureSvg, isSignatureEmpty, Stroke, strokeToPathData } from './signatureSvg';

export type SignatureCanvasHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  exportSvg: () => string;
};

type SignatureCanvasProps = {
  height?: number;
};

export const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(function SignatureCanvas(
  { height = 220 },
  ref
) {
  const { colors, radius } = useTheme();
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke>([]);
  const [size, setSize] = useState({ width: 0, height });

  useImperativeHandle(ref, () => ({
    clear: () => {
      setStrokes([]);
      setCurrentStroke([]);
    },
    isEmpty: () => isSignatureEmpty(strokes),
    exportSvg: () => buildSignatureSvg(strokes, size.width, size.height, colors.textPrimary),
  }), [strokes, size, colors.textPrimary]);

  const addPoint = (x: number, y: number) => {
    setCurrentStroke((prev) => [...prev, { x, y }]);
  };

  const commitStroke = () => {
    setCurrentStroke((prev) => {
      if (prev.length > 0) {
        setStrokes((strokesPrev) => [...strokesPrev, prev]);
      }
      return [];
    });
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((event) => {
      runOnJS(addPoint)(event.x, event.y);
    })
    .onUpdate((event) => {
      runOnJS(addPoint)(event.x, event.y);
    })
    .onEnd(() => {
      runOnJS(commitStroke)();
    });

  const onLayout = (event: LayoutChangeEvent) => {
    setSize({ width: event.nativeEvent.layout.width, height });
  };

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={onLayout}
        style={[
          styles.container,
          { height, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md },
        ]}
        accessibilityLabel="Signature canvas"
        accessibilityHint="Draw your signature with your finger"
      >
        {size.width > 0 ? (
          <Svg width={size.width} height={size.height}>
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
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
  },
});

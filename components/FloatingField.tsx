import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text as RNText, View, ViewStyle } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { fontFamily, motionTiming } from '@/theme';

import { FLOATING_FIELD_HEIGHT, FLOATING_LABEL_BACKGROUND, LABEL_CLEARANCE } from './fieldChrome';
import {
  FIELD_OUTLINE_PAD,
  FIELD_STROKE_WIDTH,
  fieldOutlinePath,
  floatedLabelLeft,
  floatedLabelMaxWidth,
  floatedLabelTop,
  FLOATING_LABEL_INSET,
  notchBounds,
} from './fieldOutline';

export { FLOATING_FIELD_HEIGHT, FLOATING_LABEL_BACKGROUND };

const REST_FONT_SIZE = 16;
const FLOAT_FONT_SIZE = 12;
/**
 * Lexend's descenders hang past the em box. A 16px line clips them, so the
 * floated label keeps a taller line. That line is centered on the top stroke.
 */
const FLOAT_LINE_HEIGHT = 20;

type FloatingFieldProps = {
  children: React.ReactNode;
  /** Label, or the placeholder when the field has no label. Omit for a plain box. */
  eyebrow?: string;
  floated: boolean;
  restingColor: string;
  floatedColor: string;
  borderColor: string;
  backgroundColor: string;
  radius: number;
  /** Distance from the top of the control to the resting label, matching the text inset. */
  restOffset: number;
  restLineHeight?: number;
  minHeight?: number;
  style?: ViewStyle;
};

/**
 * Outlined field whose label rests inside the box and animates above the top
 * border. Once floated, the stroke stops before the label and starts again
 * after it, so the line does not run into the text. The label stays
 * transparent so the page behind the field shows through the gap.
 */
export function FloatingField({
  children,
  eyebrow,
  floated,
  restingColor,
  floatedColor,
  borderColor,
  backgroundColor,
  radius,
  restOffset,
  restLineHeight = 24,
  minHeight,
  style,
}: FloatingFieldProps) {
  const progress = useSharedValue(floated ? 1 : 0);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [labelWidth, setLabelWidth] = useState(0);

  useEffect(() => {
    progress.value = motionTiming(floated ? 1 : 0, { duration: 180 });
  }, [floated, progress]);

  const restTop = LABEL_CLEARANCE + restOffset;
  const floatedTop = floatedLabelTop(LABEL_CLEARANCE, FLOAT_LINE_HEIGHT);
  const labelLeft = floatedLabelLeft(radius);
  const labelMaxWidth = box.width > 0 ? floatedLabelMaxWidth(box.width, radius) : undefined;
  const labelStyle = useAnimatedStyle(() => ({
    top: interpolate(progress.value, [0, 1], [restTop, floatedTop]),
    left: interpolate(progress.value, [0, 1], [FLOATING_LABEL_INSET, labelLeft]),
    fontSize: interpolate(progress.value, [0, 1], [REST_FONT_SIZE, FLOAT_FONT_SIZE]),
    lineHeight: interpolate(progress.value, [0, 1], [restLineHeight, FLOAT_LINE_HEIGHT]),
    color: interpolateColor(progress.value, [0, 1], [restingColor, floatedColor]),
  }));

  const onBoxLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox((current) => (current.width === width && current.height === height ? current : { width, height }));
  };

  const onLabelLayout = (event: LayoutChangeEvent) => {
    const next = Math.ceil(event.nativeEvent.layout.width);
    setLabelWidth((current) => (current === next ? current : next));
  };

  const outlined = box.width > 0 && box.height > 0;
  const notch = notchBounds(radius, labelWidth, floated && eyebrow ? 1 : 0);

  return (
    <View style={[styles.wrap, style]}>
      <View
        onLayout={onBoxLayout}
        style={[
          styles.box,
          minHeight != null ? { minHeight } : { height: FLOATING_FIELD_HEIGHT },
          {
            borderColor,
            backgroundColor,
            borderRadius: radius,
            borderWidth: outlined ? 0 : 1,
          },
        ]}
      >
        {children}
      </View>
      {outlined ? (
        <View
          style={[
            styles.outline,
            {
              left: -FIELD_OUTLINE_PAD,
              top: LABEL_CLEARANCE - FIELD_OUTLINE_PAD,
              width: box.width + FIELD_OUTLINE_PAD * 2,
              height: box.height + FIELD_OUTLINE_PAD * 2,
            },
          ]}
        >
          <Svg
            width={box.width + FIELD_OUTLINE_PAD * 2}
            height={box.height + FIELD_OUTLINE_PAD * 2}
            style={styles.svg}
          >
            <Path
              d={fieldOutlinePath(box.width, box.height, radius, notch.start, notch.end, FIELD_OUTLINE_PAD)}
              stroke={borderColor}
              strokeWidth={FIELD_STROKE_WIDTH}
              fill="none"
              strokeLinecap="butt"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      ) : null}
      {eyebrow ? (
        <RNText
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no"
          numberOfLines={1}
          onLayout={onLabelLayout}
          style={[
            styles.measure,
            {
              fontFamily: fontFamily.regular,
              fontSize: FLOAT_FONT_SIZE,
              lineHeight: FLOAT_LINE_HEIGHT,
              maxWidth: labelMaxWidth,
            },
          ]}
        >
          {eyebrow}
        </RNText>
      ) : null}
      {eyebrow ? (
        <Animated.Text
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.eyebrow,
            { fontFamily: fontFamily.regular, maxWidth: labelMaxWidth },
            labelStyle,
          ]}
        >
          {eyebrow}
        </Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingTop: LABEL_CLEARANCE,
  },
  box: {
    overflow: 'hidden',
  },
  outline: {
    position: 'absolute',
    pointerEvents: 'none',
  },
  svg: {
    overflow: 'visible',
  },
  measure: {
    position: 'absolute',
    opacity: 0,
    top: 0,
    left: FLOATING_LABEL_INSET,
    pointerEvents: 'none',
  },
  eyebrow: {
    position: 'absolute',
    left: FLOATING_LABEL_INSET,
    zIndex: 1,
    pointerEvents: 'none',
    backgroundColor: FLOATING_LABEL_BACKGROUND,
  },
});

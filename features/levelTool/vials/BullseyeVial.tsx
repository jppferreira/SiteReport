import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { bullseyeAssets } from '@/assets/levelTool';

type BullseyeVialProps = {
  size: number;
  /** Bubble offset from centre in px (already clamped to the travel radius). */
  offsetX: number;
  offsetY: number;
  isLevel: boolean;
};

/** Travel radius for the bubble centre inside a vial of `size`. */
export function bullseyeTravel(size: number): number {
  const glassR = size * 0.4;
  const bubbleR = size * 0.075;
  return glassR - bubbleR - size * 0.02;
}

/**
 * Machined circular spirit level from Figma AR Level Redesign assets.
 */
export function BullseyeVial({ size, offsetX, offsetY, isLevel }: BullseyeVialProps) {
  const scale = size / 320;
  const bezel = 300 * scale;
  const inset = 10 * scale;
  const bubble = 46 * scale;
  const bubbleShadow = 48 * scale;
  const liquid = 244 * scale;
  const liquidInset = 38 * scale;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image
        source={isLevel ? bullseyeAssets.shadowBaseLevel : bullseyeAssets.shadowBase}
        style={[
          styles.abs,
          {
            left: inset - 12 * scale,
            top: inset - 6 * scale,
            width: bezel + 24 * scale,
            height: bezel + 24 * scale,
          },
        ]}
        resizeMode="contain"
      />
      <Image
        source={bullseyeAssets.machinedBezel}
        style={[styles.abs, { left: inset, top: inset, width: bezel, height: bezel }]}
        resizeMode="cover"
      />
      <Image
        source={bullseyeAssets.turningMarks}
        style={[styles.abs, { left: inset, top: inset, width: bezel, height: bezel }]}
        resizeMode="contain"
      />
      <Image
        source={bullseyeAssets.screw}
        style={[styles.abs, { left: 155 * scale, top: 14 * scale, width: 10 * scale, height: 10 * scale }]}
      />
      <Image
        source={bullseyeAssets.screw}
        style={[
          styles.abs,
          { left: 277.11 * scale, top: 225.5 * scale, width: 10 * scale, height: 10 * scale },
        ]}
      />
      <Image
        source={bullseyeAssets.screw}
        style={[
          styles.abs,
          { left: 32.89 * scale, top: 225.5 * scale, width: 10 * scale, height: 10 * scale },
        ]}
      />
      <Image
        source={bullseyeAssets.chamfer}
        style={[
          styles.abs,
          { left: 26 * scale, top: 26 * scale, width: 268 * scale, height: 268 * scale },
        ]}
        resizeMode="contain"
      />
      <Image
        source={bullseyeAssets.recess}
        style={[
          styles.abs,
          { left: 34 * scale, top: 34 * scale, width: 252 * scale, height: 252 * scale },
        ]}
        resizeMode="contain"
      />
      <Image
        source={bullseyeAssets.liquid}
        style={[styles.abs, { left: liquidInset, top: liquidInset, width: liquid, height: liquid }]}
        resizeMode="contain"
      />
      <Image
        source={bullseyeAssets.etchedRings}
        style={[styles.abs, { left: liquidInset, top: liquidInset, width: liquid, height: liquid }]}
        resizeMode="contain"
      />
      {isLevel ? (
        <Image
          source={bullseyeAssets.targetGlow}
          style={[
            styles.abs,
            { left: 126 * scale, top: 126 * scale, width: 68 * scale, height: 68 * scale },
          ]}
          resizeMode="contain"
        />
      ) : null}
      <Image
        source={bullseyeAssets.bubbleShadow}
        style={[
          styles.abs,
          {
            left: center - bubbleShadow / 2 + offsetX + 2 * scale,
            top: center - bubbleShadow / 2 + offsetY + 6 * scale,
            width: bubbleShadow,
            height: bubbleShadow,
          },
        ]}
        resizeMode="contain"
      />
      <Image
        source={bullseyeAssets.bubble}
        style={[
          styles.abs,
          {
            left: center - bubble / 2 + offsetX,
            top: center - bubble / 2 + offsetY,
            width: bubble,
            height: bubble,
          },
        ]}
        resizeMode="contain"
      />
      <Image
        source={bullseyeAssets.bubbleHighlight}
        style={[
          styles.abs,
          {
            left: center - bubble / 2 + offsetX + 9 * scale,
            top: center - bubble / 2 + offsetY + 8 * scale,
            width: 16 * scale,
            height: 9 * scale,
          },
        ]}
        resizeMode="contain"
      />
      <Image
        source={bullseyeAssets.bubbleCaustic}
        style={[
          styles.abs,
          {
            left: center - bubble / 2 + offsetX + 15 * scale,
            top: center - bubble / 2 + offsetY + 33 * scale,
            width: 18 * scale,
            height: 6 * scale,
          },
        ]}
        resizeMode="contain"
      />
      <Image
        source={bullseyeAssets.glassCrescent}
        style={[
          styles.abs,
          {
            left: 42 * scale,
            top: 42 * scale,
            width: 218.832 * scale,
            height: 193.324 * scale,
          },
        ]}
        resizeMode="contain"
      />
      <Image
        source={bullseyeAssets.domeReflection}
        style={[
          styles.abs,
          { left: 82 * scale, top: 50 * scale, width: 150 * scale, height: 74 * scale },
        ]}
        resizeMode="contain"
      />
      <Image
        source={bullseyeAssets.glassRim}
        style={[styles.abs, { left: liquidInset, top: liquidInset, width: liquid, height: liquid }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});

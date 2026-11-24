import React, { useId } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { boxAssets } from '@/assets/levelTool';

/** Aluminium box level built from Figma AR Level Redesign assets + gradients. */
export function BoxLevelVial({
  width,
  angleDeg,
  isLevel,
}: {
  width: number;
  angleDeg: number;
  isLevel: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const DESIGN_W = 700;
  const DESIGN_H = 128;
  const scale = width / DESIGN_W;
  const height = DESIGN_H * scale;
  const clamped = Math.max(-1, Math.min(1, angleDeg / 15));
  const bubbleX = -clamped * 62 * scale;
  const vialLeft = 230 * scale;
  const vialTop = 41 * scale;
  const vialW = 240 * scale;
  const vialH = 46 * scale;
  const bubbleW = 54 * scale;
  const bubbleH = 28 * scale;
  const bodyId = `boxBody_${uid}`;
  const vialId = `boxVial_${uid}`;

  return (
    <View
      style={{ width, height }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={width} height={height} style={styles.abs}>
        <Defs>
          <LinearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8F9491" />
            <Stop offset="0.05" stopColor="#E9ECEA" />
            <Stop offset="0.13" stopColor="#B7BCB9" />
            <Stop offset="0.33" stopColor="#D5D9D6" />
            <Stop offset="0.5" stopColor="#C1C5C2" />
            <Stop offset="0.64" stopColor="#DCDFD9" />
            <Stop offset="0.84" stopColor="#ABB0AD" />
            <Stop offset="0.93" stopColor="#E0E3E1" />
            <Stop offset="1" stopColor="#767B78" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} rx={8 * scale} fill={`url(#${bodyId})`} />
        <Rect x={0} y={0} width={width} height={5 * scale} rx={8 * scale} fill="#F2F4F3" />
        <Rect x={0} y={height - 9 * scale} width={width} height={9 * scale} rx={8 * scale} fill="#3A3E3B" />
      </Svg>
      <Image
        source={boxAssets.brushedGrain}
        style={[styles.abs, { width, height, opacity: 0.45 }]}
        resizeMode="stretch"
      />
      {/* Plain RN Text (not a Fragment wrapper) — keep branding off Svg to avoid
          react-native-svg forwarding host props into Fragments on Android. */}
      <Text
        allowFontScaling={false}
        style={[
          styles.brand,
          { left: 62 * scale, top: 30 * scale, fontSize: 12 * scale, letterSpacing: 3 * scale },
        ]}
      >
        TRADE REPORT
      </Text>
      <Text
        allowFontScaling={false}
        style={[
          styles.spec,
          { left: 62 * scale, top: 50 * scale, fontSize: 9 * scale, letterSpacing: 1 * scale },
        ]}
      >
        {'\u00B10.5 mm/m'}
      </Text>
      <Image
        source={boxAssets.mmScale}
        style={[
          styles.abs,
          { left: 56 * scale, top: 103 * scale, width: 588 * scale, height: 14 * scale },
        ]}
        resizeMode="stretch"
      />
      <View
        style={[
          styles.abs,
          {
            left: 528 * scale,
            top: 34 * scale,
            width: 118 * scale,
            height: 52 * scale,
            borderRadius: 26 * scale,
            backgroundColor: '#4A4E4B',
          },
        ]}
      />
      <View
        style={[
          styles.abs,
          {
            left: 206 * scale,
            top: 19 * scale,
            width: 288 * scale,
            height: 90 * scale,
            borderRadius: 16 * scale,
            backgroundColor: '#A8ACA8',
          },
        ]}
      />
      <View
        style={[
          styles.abs,
          {
            left: 210 * scale,
            top: 23 * scale,
            width: 280 * scale,
            height: 82 * scale,
            borderRadius: 13 * scale,
            backgroundColor: '#D5D8C4',
          },
        ]}
      />
      <View
        style={[
          styles.abs,
          {
            left: vialLeft,
            top: vialTop,
            width: vialW,
            height: vialH,
            borderRadius: 23 * scale,
            overflow: 'hidden',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: 'rgba(255,255,255,0.4)',
          },
        ]}
      >
        <Svg width={vialW} height={vialH} style={styles.abs}>
          <Defs>
            <LinearGradient id={vialId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={isLevel ? '#B8F0A0' : '#F5FAB0'} />
              <Stop offset="0.32" stopColor={isLevel ? '#5BC96A' : '#DBEA5C'} />
              <Stop offset="0.7" stopColor={isLevel ? '#1FA84A' : '#B4C834'} />
              <Stop offset="1" stopColor={isLevel ? '#0E7A32' : '#7C8F15'} />
            </LinearGradient>
          </Defs>
          <Rect width={vialW} height={vialH} fill={`url(#${vialId})`} />
        </Svg>
        <View
          style={[
            styles.graduation,
            { left: 87.7 * scale, top: 2 * scale, width: 2.6 * scale, height: 42 * scale, opacity: 0.9 },
          ]}
        />
        <View
          style={[
            styles.graduation,
            { left: 149.7 * scale, top: 2 * scale, width: 2.6 * scale, height: 42 * scale, opacity: 0.9 },
          ]}
        />
        <View
          style={[
            styles.graduation,
            { left: 63.3 * scale, top: 2 * scale, width: 1.4 * scale, height: 42 * scale, opacity: 0.55 },
          ]}
        />
        <View
          style={[
            styles.graduation,
            { left: 175.3 * scale, top: 2 * scale, width: 1.4 * scale, height: 42 * scale, opacity: 0.55 },
          ]}
        />
        <View
          style={[
            styles.bubble,
            {
              left: vialW / 2 - bubbleW / 2 + bubbleX,
              top: (vialH - bubbleH) / 2,
              width: bubbleW,
              height: bubbleH,
              borderRadius: bubbleH / 2,
            },
          ]}
        >
          <Image
            source={boxAssets.bubbleHighlight}
            style={{
              position: 'absolute',
              left: 9 * scale,
              top: 4 * scale,
              width: 22 * scale,
              height: 7 * scale,
            }}
            resizeMode="contain"
          />
        </View>
      </View>
      <EndCap scale={scale} left={-26 * scale} height={height} />
      <EndCap scale={scale} left={682 * scale} height={height} />
    </View>
  );
}

function EndCap({ scale, left, height }: { scale: number; left: number; height: number }) {
  return (
    <View
      style={[
        styles.abs,
        {
          left,
          top: -5 * scale,
          width: 44 * scale,
          height: height + 10 * scale,
          borderRadius: 10 * scale,
          backgroundColor: '#1A1C1A',
          overflow: 'hidden',
        },
      ]}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.abs,
            {
              left: 12 * scale + i * 8 * scale,
              top: 27 * scale,
              width: 3 * scale,
              height: 94 * scale,
              borderRadius: 1.5 * scale,
              backgroundColor: 'rgba(0,0,0,0.45)',
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  brand: {
    position: 'absolute',
    color: 'rgba(26,28,26,0.4)',
    fontWeight: '600',
  },
  spec: {
    position: 'absolute',
    color: 'rgba(26,28,26,0.3)',
    fontWeight: '500',
  },
  graduation: {
    position: 'absolute',
    backgroundColor: '#111311',
    borderRadius: 1,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(250,255,227,0.92)',
    borderWidth: 1,
    borderColor: '#5A6914',
    overflow: 'hidden',
  },
});

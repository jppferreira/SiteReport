import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';

import { BUBBLE_MAX_DEG, bubbleOffset, formatDegrees } from './levelMath';
import { useDeviceLevel } from './useDeviceLevel';

type LevelToolViewProps = {
  /** When false, the accelerometer subscription pauses. */
  active: boolean;
  /** Extra top inset reserved for the shared mode switcher / close row. */
  topReserve?: number;
};

const CIRCLE_SIZE = 280;
const CIRCLE_BUBBLE = 42;
const TUBE_WIDTH = 300;
const TUBE_HEIGHT = 56;
const TUBE_BUBBLE_W = 36;
const TUBE_BUBBLE_H = 28;

/** Full-screen spirit level with a circular bullseye + tubular vial. */
export function LevelToolView({ active, topReserve = 0 }: LevelToolViewProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const { reading, available, ready } = useDeviceLevel(active);
  const wasLevelRef = useRef(false);

  useEffect(() => {
    if (!reading) return;
    if (reading.isLevel && !wasLevelRef.current && Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    wasLevelRef.current = reading.isLevel;
  }, [reading]);

  const circleTravel = (CIRCLE_SIZE * 0.62 - CIRCLE_BUBBLE) / 2;
  const circleOffset = reading
    ? bubbleOffset(reading.rollDeg, reading.pitchDeg, circleTravel, BUBBLE_MAX_DEG)
    : { x: 0, y: 0 };

  const tubeTravel = (TUBE_WIDTH * 0.72 - TUBE_BUBBLE_W) / 2;
  const tubeX = reading
    ? Math.max(-1, Math.min(1, -reading.rollDeg / BUBBLE_MAX_DEG)) * tubeTravel
    : 0;

  const isLevel = reading?.isLevel ?? false;
  const accent = isLevel ? '#1FA84A' : '#E8C547';
  const fluid = isLevel ? '#2BBF6A' : '#C9B23A';

  const statusLabel =
    available === false
      ? t('levelTool.unavailable')
      : !ready
        ? t('levelTool.waiting')
        : isLevel
          ? t('levelTool.level')
          : t('levelTool.offLevel');

  return (
    <View style={[styles.fill, { paddingTop: topReserve, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.hintWrap}>
        <Text variant="bodySmall" color="rgba(255,255,255,0.85)" style={styles.hint}>
          {t('levelTool.hint')}
        </Text>
      </View>

      <View style={[styles.stage, { minHeight: Math.max(300, winH * 0.42) }]}>
        <CircularSpiritVial
          size={CIRCLE_SIZE}
          bubbleSize={CIRCLE_BUBBLE}
          offsetX={circleOffset.x}
          offsetY={circleOffset.y}
          isLevel={isLevel}
          fluid={fluid}
          accent={accent}
        />
      </View>

      <View style={styles.tubeSection}>
        <Text variant="caption" color="rgba(255,255,255,0.55)" style={styles.tubeLabel}>
          {t('levelTool.roll')}
        </Text>
        <TubularSpiritVial
          width={TUBE_WIDTH}
          height={TUBE_HEIGHT}
          bubbleW={TUBE_BUBBLE_W}
          bubbleH={TUBE_BUBBLE_H}
          offsetX={tubeX}
          isLevel={Math.abs(reading?.rollDeg ?? 99) <= 0.5}
          fluid={fluid}
          accent={accent}
        />
      </View>

      <View style={styles.readouts}>
        <Text variant="h1" color="#FFFFFF" style={styles.tilt}>
          {reading ? formatDegrees(reading.tiltDeg) : '—'}
        </Text>
        <Text variant="bodyMedium" color={accent} style={styles.status}>
          {statusLabel}
        </Text>
        <View style={styles.axisRow}>
          <View style={styles.axisChip}>
            <Text variant="caption" color="rgba(255,255,255,0.55)">
              {t('levelTool.roll')}
            </Text>
            <Text variant="bodyMedium" color="#FFFFFF">
              {reading ? formatDegrees(reading.rollDeg) : '—'}
            </Text>
          </View>
          <View style={styles.axisChip}>
            <Text variant="caption" color="rgba(255,255,255,0.55)">
              {t('levelTool.pitch')}
            </Text>
            <Text variant="bodyMedium" color="#FFFFFF">
              {reading ? formatDegrees(reading.pitchDeg) : '—'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function CircularSpiritVial({
  size,
  bubbleSize,
  offsetX,
  offsetY,
  isLevel,
  fluid,
  accent,
}: {
  size: number;
  bubbleSize: number;
  offsetX: number;
  offsetY: number;
  isLevel: boolean;
  fluid: string;
  accent: string;
}) {
  const c = size / 2;
  const outerR = size / 2 - 2;
  const bezelR = outerR - 10;
  const glassR = bezelR - 8;
  const fluidR = glassR - 4;
  const targetR = bubbleSize * 0.72;
  const bubbleR = bubbleSize / 2;
  const bx = c + offsetX;
  const by = c + offsetY;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="metal" cx="35%" cy="28%" r="75%">
          <Stop offset="0%" stopColor="#6A6E68" />
          <Stop offset="45%" stopColor="#2C302C" />
          <Stop offset="100%" stopColor="#121412" />
        </RadialGradient>
        <RadialGradient id="fluidFill" cx="40%" cy="35%" r="70%">
          <Stop offset="0%" stopColor={fluid} stopOpacity="0.55" />
          <Stop offset="70%" stopColor={fluid} stopOpacity="0.28" />
          <Stop offset="100%" stopColor={fluid} stopOpacity="0.12" />
        </RadialGradient>
        <LinearGradient id="glassShine" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
          <Stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
        <RadialGradient id="bubbleBody" cx="35%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <Stop offset="55%" stopColor="#F2F5F0" stopOpacity="0.75" />
          <Stop offset="100%" stopColor="#C8D0C4" stopOpacity="0.55" />
        </RadialGradient>
      </Defs>

      {/* Machined metal housing */}
      <Circle cx={c} cy={c} r={outerR} fill="url(#metal)" />
      <Circle cx={c} cy={c} r={outerR - 3} stroke="#8A9088" strokeWidth={1.5} fill="none" opacity={0.5} />
      <Circle cx={c} cy={c} r={bezelR} fill="#1A1C1A" stroke="#3A3E3A" strokeWidth={2} />

      {/* Glass bowl + fluid */}
      <Circle cx={c} cy={c} r={glassR} fill="#0E1210" stroke="#9AA39A" strokeWidth={2.5} />
      <Circle cx={c} cy={c} r={fluidR} fill="url(#fluidFill)" />
      <Ellipse cx={c} cy={c - glassR * 0.35} rx={glassR * 0.72} ry={glassR * 0.28} fill="url(#glassShine)" />

      {/* Etched target rings */}
      <Circle cx={c} cy={c} r={targetR} stroke={accent} strokeWidth={isLevel ? 2.5 : 1.5} fill="none" opacity={0.9} />
      <Circle cx={c} cy={c} r={targetR * 1.55} stroke="rgba(255,255,255,0.28)" strokeWidth={1} fill="none" />
      <Line x1={c - glassR + 8} y1={c} x2={c - targetR - 4} y2={c} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
      <Line x1={c + targetR + 4} y1={c} x2={c + glassR - 8} y2={c} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
      <Line x1={c} y1={c - glassR + 8} x2={c} y2={c - targetR - 4} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
      <Line x1={c} y1={c + targetR + 4} x2={c} y2={c + glassR - 8} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />

      {/* Air bubble */}
      <G>
        <Circle cx={bx} cy={by} r={bubbleR} fill="url(#bubbleBody)" stroke="rgba(255,255,255,0.85)" strokeWidth={1.2} />
        <Ellipse
          cx={bx - bubbleR * 0.28}
          cy={by - bubbleR * 0.32}
          rx={bubbleR * 0.32}
          ry={bubbleR * 0.2}
          fill="#FFFFFF"
          opacity={0.85}
        />
        <Circle cx={bx + bubbleR * 0.22} cy={by + bubbleR * 0.28} r={bubbleR * 0.12} fill="#FFFFFF" opacity={0.35} />
      </G>

      {/* Outer rim catch-light */}
      <Circle cx={c} cy={c} r={outerR - 1} stroke="#FFFFFF" strokeWidth={1} fill="none" opacity={0.12} />
    </Svg>
  );
}

function TubularSpiritVial({
  width,
  height,
  bubbleW,
  bubbleH,
  offsetX,
  isLevel,
  fluid,
  accent,
}: {
  width: number;
  height: number;
  bubbleW: number;
  bubbleH: number;
  offsetX: number;
  isLevel: boolean;
  fluid: string;
  accent: string;
}) {
  const bodyH = height;
  const tubeH = height * 0.55;
  const tubeY = (bodyH - tubeH) / 2;
  const tubeX = width * 0.08;
  const tubeW = width * 0.84;
  const tubeR = tubeH / 2;
  const cx = width / 2;
  const cy = bodyH / 2;
  const bubbleCx = cx + offsetX;
  const markGap = 10;

  return (
    <Svg width={width} height={bodyH}>
      <Defs>
        <LinearGradient id="barMetal" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#5A5E58" />
          <Stop offset="35%" stopColor="#2E322E" />
          <Stop offset="100%" stopColor="#141614" />
        </LinearGradient>
        <LinearGradient id="tubeFluid" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={fluid} stopOpacity="0.65" />
          <Stop offset="50%" stopColor={fluid} stopOpacity="0.35" />
          <Stop offset="100%" stopColor={fluid} stopOpacity="0.2" />
        </LinearGradient>
        <LinearGradient id="tubeGlass" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <Stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <Stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
        </LinearGradient>
        <RadialGradient id="tubeBubble" cx="35%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <Stop offset="100%" stopColor="#D0D6CC" stopOpacity="0.65" />
        </RadialGradient>
      </Defs>

      {/* Aluminum level body */}
      <Rect x={0} y={0} width={width} height={bodyH} rx={10} fill="url(#barMetal)" />
      <Rect x={2} y={2} width={width - 4} height={bodyH * 0.28} rx={8} fill="#FFFFFF" opacity={0.08} />
      {/* End caps */}
      <Rect x={0} y={0} width={14} height={bodyH} rx={10} fill="#0C0E0C" opacity={0.55} />
      <Rect x={width - 14} y={0} width={14} height={bodyH} rx={10} fill="#0C0E0C" opacity={0.55} />

      {/* Glass tube window cutout */}
      <Path
        d={roundedTubePath(tubeX, tubeY, tubeW, tubeH, tubeR)}
        fill="#0A0E0B"
        stroke="#8B9388"
        strokeWidth={1.5}
      />
      <Path d={roundedTubePath(tubeX + 2, tubeY + 2, tubeW - 4, tubeH - 4, tubeR - 2)} fill="url(#tubeFluid)" />
      <Path
        d={roundedTubePath(tubeX + 2, tubeY + 2, tubeW - 4, (tubeH - 4) * 0.42, tubeR - 2)}
        fill="url(#tubeGlass)"
      />

      {/* Center marks (level when bubble sits between them) */}
      <Line
        x1={cx - markGap}
        y1={tubeY + 3}
        x2={cx - markGap}
        y2={tubeY + tubeH - 3}
        stroke={accent}
        strokeWidth={isLevel ? 2.5 : 1.5}
        opacity={0.95}
      />
      <Line
        x1={cx + markGap}
        y1={tubeY + 3}
        x2={cx + markGap}
        y2={tubeY + tubeH - 3}
        stroke={accent}
        strokeWidth={isLevel ? 2.5 : 1.5}
        opacity={0.95}
      />
      <Line x1={cx} y1={tubeY + 5} x2={cx} y2={tubeY + tubeH - 5} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />

      {/* Bubble */}
      <Ellipse
        cx={bubbleCx}
        cy={cy}
        rx={bubbleW / 2}
        ry={bubbleH / 2}
        fill="url(#tubeBubble)"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth={1}
      />
      <Ellipse
        cx={bubbleCx - bubbleW * 0.15}
        cy={cy - bubbleH * 0.2}
        rx={bubbleW * 0.18}
        ry={bubbleH * 0.12}
        fill="#FFFFFF"
        opacity={0.8}
      />
    </Svg>
  );
}

function roundedTubePath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h / 2, w / 2);
  return [
    `M ${x + rr} ${y}`,
    `H ${x + w - rr}`,
    `A ${rr} ${rr} 0 0 1 ${x + w} ${y + rr}`,
    `V ${y + h - rr}`,
    `A ${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h}`,
    `H ${x + rr}`,
    `A ${rr} ${rr} 0 0 1 ${x} ${y + h - rr}`,
    `V ${y + rr}`,
    `A ${rr} ${rr} 0 0 1 ${x + rr} ${y}`,
    'Z',
  ].join(' ');
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: '#0B0D0B',
  },
  hintWrap: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  hint: {
    textAlign: 'center',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tubeSection: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tubeLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  readouts: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
  },
  tilt: {
    fontVariant: ['tabular-nums'],
  },
  status: {
    textAlign: 'center',
  },
  axisRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  axisChip: {
    minWidth: 108,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    gap: 2,
  },
});

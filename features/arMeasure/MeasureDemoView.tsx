import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';

import { Text } from '@/components';
import { ArTopBar, AR_COLORS, type ArToolMode } from '@/features/arTools';
import { useI18n } from '@/i18n/useI18n';

type MeasureDemoViewProps = {
  onClose: () => void;
  onChangeMode: (mode: ArToolMode) => void;
};

/**
 * Store / simulator demo: real Measure chrome over a still door photo with
 * height + width tape overlays. Not used in production AR sessions.
 */
export function MeasureDemoView({ onClose, onChangeMode }: MeasureDemoViewProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width: w, height: h } = useWindowDimensions();

  // Door frame in normalized coords (tuned to assets/images/ar-demo-door.jpg).
  const door = {
    left: w * 0.22,
    right: w * 0.78,
    top: h * 0.16,
    bottom: h * 0.78,
  };
  const heightMidX = door.left - 4;
  const heightMidY = (door.top + door.bottom) / 2;
  const widthMidX = (door.left + door.right) / 2;
  const widthMidY = door.bottom + 2;
  // Live segment: finishing door height — dashed line to reticle near the top hinge.
  const liveFrom = { x: door.left, y: door.bottom };
  const reticle = { x: door.left, y: door.top + (door.bottom - door.top) * 0.12 };

  return (
    <View style={styles.fill}>
      <Image
        source={require('../../assets/images/ar-demo-door.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />

      <Svg pointerEvents="none" width={w} height={h} style={StyleSheet.absoluteFill}>
        {/* Completed width across the threshold */}
        <Line
          x1={door.left}
          y1={door.bottom}
          x2={door.right}
          y2={door.bottom}
          stroke={AR_COLORS.brand}
          strokeWidth={4}
          strokeLinecap="round"
        />
        {/* Live height run up the jamb */}
        <Line
          x1={liveFrom.x}
          y1={liveFrom.y}
          x2={reticle.x}
          y2={reticle.y}
          stroke="#FFFFFF"
          strokeWidth={2.5}
          strokeDasharray="8 6"
          strokeLinecap="round"
        />
        <Circle cx={door.left} cy={door.bottom} r={8} fill={AR_COLORS.brand} stroke="#FFFFFF" strokeWidth={2.5} />
        <Circle cx={door.right} cy={door.bottom} r={8} fill={AR_COLORS.brand} stroke="#FFFFFF" strokeWidth={2.5} />
        <Circle cx={reticle.x} cy={reticle.y} r={8} fill={AR_COLORS.brand} stroke="#FFFFFF" strokeWidth={2.5} />
      </Svg>

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LabelPill x={widthMidX} y={widthMidY - 22} text="0.86 m" />
        <LabelPill x={heightMidX - 8} y={heightMidY} text="1.78 m" live />
      </View>

      <View pointerEvents="none" style={[styles.reticle, { left: reticle.x - 30, top: reticle.y - 30 }]}>
        <View style={[styles.reticleRing, { borderColor: '#FFFFFF' }]} />
        <View style={[styles.reticleDot, { backgroundColor: AR_COLORS.brand }]} />
      </View>

      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <ArTopBar
          tone="light"
          mode="measure"
          onChangeMode={onChangeMode}
          onClose={onClose}
          right={{ icon: 'help', label: t('arTools.measure.help'), onPress: () => undefined }}
        />
        <View style={styles.secondRow}>
          <View style={[styles.chip, styles.chipOk]}>
            <Ionicons name="scan-outline" size={13} color={AR_COLORS.brand} />
            <Text variant="caption" color={AR_COLORS.ink}>
              {t('arTools.measure.lidarChip')}
            </Text>
          </View>
          <View style={styles.secondRowRight}>
            <GlassPill icon="arrow-undo" label={t('arTools.measure.undo')} />
            <GlassPill icon="trash-outline" label={t('arTools.measure.clear')} />
          </View>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.hintPill}>
          <Text variant="caption" color="#FFFFFF">
            {t('arTools.measure.aimNext')}
          </Text>
        </View>
        <View style={styles.controls}>
          <RoundAction icon="magnet-outline" label={t('arTools.measure.snapOn')} active />
          <View style={styles.addWrap}>
            <Pressable
              style={styles.addButton}
              accessibilityRole="button"
              accessibilityLabel={t('arTools.measure.addPoint')}
            >
              <Ionicons name="add" size={38} color="#FFFFFF" />
            </Pressable>
            <Text variant="caption" color="#FFFFFF" style={styles.shadowText}>
              {t('arTools.measure.addPoint')}
            </Text>
          </View>
          <RoundAction icon="checkmark" label={t('arTools.measure.finish')} />
        </View>
      </View>
    </View>
  );
}

function LabelPill({ x, y, text, live }: { x: number; y: number; text: string; live?: boolean }) {
  return (
    <View style={[styles.labelPill, { left: x - 60, top: y - 16 }]}>
      <Text
        variant="label"
        color="#FFFFFF"
        style={[styles.labelText, live && styles.labelTextLive]}
      >
        {text}
      </Text>
    </View>
  );
}

function GlassPill({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.glassPill}>
      <Ionicons name={icon} size={15} color={AR_COLORS.ink} />
      <Text variant="label" color={AR_COLORS.ink}>
        {label}
      </Text>
    </View>
  );
}

function RoundAction({
  icon,
  label,
  active,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active?: boolean;
}) {
  return (
    <View style={styles.roundWrap}>
      <View style={[styles.round, active && { borderColor: AR_COLORS.brand, borderWidth: 2 }]}>
        <Ionicons name={icon} size={20} color={AR_COLORS.ink} />
      </View>
      <Text variant="caption" color="#FFFFFF" style={styles.shadowText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, gap: 10 },
  secondRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  secondRowRight: { flexDirection: 'row', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipOk: { backgroundColor: AR_COLORS.lightGlass },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    backgroundColor: AR_COLORS.lightGlass,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
  },
  reticle: { position: 'absolute', width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  reticleRing: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
  },
  reticleDot: { width: 8, height: 8, borderRadius: 4 },
  labelPill: {
    position: 'absolute',
    width: 120,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    backgroundColor: AR_COLORS.brand,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  labelTextLive: { backgroundColor: 'rgba(18,20,18,0.78)' },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: 16,
  },
  hintPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: AR_COLORS.glassStrong,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingHorizontal: 32,
  },
  roundWrap: { alignItems: 'center', gap: 6, width: 76 },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AR_COLORS.lightGlass,
  },
  addWrap: { alignItems: 'center', gap: 6 },
  addButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AR_COLORS.brand,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  shadowText: {
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
});

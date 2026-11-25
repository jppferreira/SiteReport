import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components';
import { ArTopBar, GlassIconButton, AR_COLORS, type ArToolMode } from '@/features/arTools';
import { useI18n } from '@/i18n/useI18n';

import { calibratedReading, calibrationFor } from './levelCalibration';
import { levelDirection } from './levelDirection';
import { BUBBLE_MAX_DEG, bubbleOffset, formatDegrees } from './levelMath';
import {
  createOrientationTracker,
  isEdgeOrientation,
  isPlumbOrientation,
  stepOrientationTracker,
  UI_ROTATION_DEG,
  type LevelOrientation,
} from './levelOrientation';
import { formatRatio, formatSlope, LEVEL_UNITS } from './levelUnits';
import { useDeviceLevel } from './useDeviceLevel';
import { useLevelSettings } from './useLevelSettings';
import { BoxLevelVial } from './vials/BoxLevelVial';
import { BullseyeVial, bullseyeTravel } from './vials/BullseyeVial';

type LevelToolViewProps = {
  active: boolean;
  onClose?: () => void;
  onChangeMode?: (mode: ArToolMode) => void;
  /** Kept for callers that provide their own top chrome. */
  topReserve?: number;
};

type HeldReading = {
  orientation: LevelOrientation;
  reading: ReturnType<typeof calibratedReading>;
};

/** Surface level, long-edge line level and short-edge plumb, driven by gravity. */
export function LevelToolView({ active, onClose, onChangeMode, topReserve = 0 }: LevelToolViewProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { reading: raw, gravity, available, ready } = useDeviceLevel(active);
  const { settings, setUnit, toggleHaptics, toggleSound, setUprightVial, setZero } = useLevelSettings();
  const trackerRef = useRef(createOrientationTracker());
  const [orientation, setOrientation] = useState<LevelOrientation>('flat');
  const [held, setHeld] = useState<HeldReading | null>(null);
  const [zeroNotice, setZeroNotice] = useState(false);
  const wasLevelRef = useRef(false);
  const player = useAudioPlayer(require('../../assets/sounds/level-tick.wav'));
  const rotation = useSharedValue(0);
  const animatedFrameStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    if (!active || !gravity || held) return;
    const next = stepOrientationTracker(trackerRef.current, gravity, Date.now());
    trackerRef.current = next;
    if (next.current !== orientation) setOrientation(next.current);
  }, [active, gravity, held, orientation]);

  const liveReading = raw && gravity ? calibratedReading(orientation, raw, gravity, settings.calibration) : null;
  const displayed = held?.reading ?? liveReading;
  const shownOrientation = held?.orientation ?? orientation;
  const isLevel = !!displayed?.isLevel && ready;

  useEffect(() => {
    if (!active || held || !displayed) return;
    if (displayed.isLevel && !wasLevelRef.current) {
      if (settings.haptics && Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
      if (settings.sound) {
        void player.seekTo(0).then(() => player.play()).catch(() => undefined);
      }
    }
    wasLevelRef.current = displayed.isLevel;
  }, [active, displayed, held, player, settings.haptics, settings.sound]);

  useEffect(() => {
    if (!zeroNotice) return;
    const timer = setTimeout(() => setZeroNotice(false), 2400);
    return () => clearTimeout(timer);
  }, [zeroNotice]);

  useEffect(() => {
    if (!active) return;
    // Reset when the tool is hidden so it starts fresh next time.
    return () => {
      setHeld(null);
      wasLevelRef.current = false;
      trackerRef.current = createOrientationTracker();
      setOrientation('flat');
    };
  }, [active]);

  const longEdge = isEdgeOrientation(shownOrientation);
  const plumb = isPlumbOrientation(shownOrientation);
  const insetY = Math.max(insets.top, insets.bottom, 16);
  const insetX = Math.max(insets.left, insets.right);
  const availableW = width - insetX * 2;
  const availableH = height - insetY * 2 - topReserve;
  const frameW = longEdge ? availableH : availableW;
  const frameH = longEdge ? availableW : availableH;
  const rotationDeg = UI_ROTATION_DEG[shownOrientation];
  useEffect(() => {
    rotation.value = withTiming(rotationDeg, { duration: 280 });
  }, [rotation, rotationDeg]);
  const compact = frameH < 600;
  const bezelSize = Math.min(frameW - 50, Math.max(180, frameH * 0.44), 340);
  const offset = displayed
    ? bubbleOffset(displayed.rollDeg, displayed.pitchDeg, bullseyeTravel(bezelSize), BUBBLE_MAX_DEG)
    : { x: 0, y: 0 };
  // In the flat UI x is screen-right and y is screen-down. CoreMotion x/y are
  // already the physical gravity direction; the air bubble moves the other way.
  const accent = isLevel ? AR_COLORS.brandText : AR_COLORS.offLevel;
  const hasZero = settings.calibration[shownOrientation] != null;
  const ratio = displayed ? formatRatio(displayed.tiltDeg) : null;
  const angle = isLevel ? 0 : displayed?.tiltDeg;
  const readout = angle === undefined ? '—' : formatSlope(angle, settings.unit);
  const status = available === false
    ? t('arTools.level.unavailable')
    : !ready
      ? t('arTools.level.waiting')
      : displayed
        ? t(`arTools.level.direction.${levelDirection(shownOrientation, displayed)}`)
        : '';

  const handleHold = () => {
    if (held) setHeld(null);
    else if (liveReading) setHeld({ orientation, reading: liveReading });
  };
  const handleZero = () => {
    if (!raw || !gravity || held) return;
    Alert.alert(t('arTools.level.zeroTitle'), t('arTools.level.zeroBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      ...(hasZero ? [{ text: t('arTools.level.clearZero'), onPress: () => setZero(shownOrientation, null) }] : []),
      { text: t('arTools.level.setZero'), onPress: () => {
        setZero(shownOrientation, calibrationFor(shownOrientation, raw, gravity));
        setZeroNotice(true);
      } },
    ]);
  };

  const tools = (
    <View style={styles.tools}>
      <ToolButton icon={held ? 'lock-closed-outline' : 'lock-open-outline'} label={t('arTools.level.hold')} active={!!held} disabled={!ready} onPress={handleHold} />
      <ToolButton icon="locate-outline" label={t('arTools.level.zero')} active={hasZero} disabled={!ready || !!held} onPress={handleZero} />
      <ToolButton label={t('arTools.level.haptics')} active={settings.haptics} onPress={toggleHaptics} vibrate />
    </View>
  );
  const units = (
    <View style={styles.units}>
      {LEVEL_UNITS.map((unit) => (
        <Pressable
          key={unit}
          onPress={() => setUnit(unit)}
          style={[styles.unit, settings.unit === unit && styles.unitActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: settings.unit === unit }}
          accessibilityLabel={t(`arTools.level.units.${unit}`)}
        >
          <Text variant="caption" color={settings.unit === unit ? AR_COLORS.ink : AR_COLORS.textSoft}>
            {t(`arTools.level.units.${unit}`)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
  /** Portrait/plumb only — flat always uses the bullseye; sideways always uses the box. */
  const uprightStyleSwitch = plumb ? (
    <View style={styles.units}>
      {([
        { id: 'bubble' as const, label: t('arTools.level.styleBubble') },
        { id: 'box' as const, label: t('arTools.level.styleBox') },
      ]).map((option) => (
        <Pressable
          key={option.id}
          onPress={() => setUprightVial(option.id)}
          style={[styles.unit, settings.uprightVial === option.id && styles.unitActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: settings.uprightVial === option.id }}
          accessibilityLabel={option.label}
        >
          <Text variant="caption" color={settings.uprightVial === option.id ? AR_COLORS.ink : AR_COLORS.textSoft}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  ) : null;
  const showBullseye = shownOrientation === 'flat' || (plumb && settings.uprightVial === 'bubble');
  const portraitBoxWidth = Math.min(frameW - 32, 360);
  const portraitBoxHeight = (portraitBoxWidth / 700) * 128;
  const numbers = (
    <View style={[styles.readouts, longEdge && styles.edgeReadouts]} accessibilityLiveRegion="polite">
      {isLevel ? <View style={styles.levelBadge}><Ionicons name="checkmark" size={13} color={AR_COLORS.brandText} /><Text variant="caption" color={AR_COLORS.brandText}>{t(plumb ? 'arTools.level.plumbBadge' : 'arTools.level.levelBadge')}</Text></View> : null}
      <Text variant="display" color={isLevel ? AR_COLORS.brandText : '#FFFFFF'} style={[styles.readout, compact && styles.readoutCompact, settings.unit === 'mmPerM' && styles.mmReadout]}>{readout}</Text>
      <Text variant="caption" color={available === false ? AR_COLORS.textSoft : accent} style={styles.status}>
        {held ? `${t('arTools.level.held')} · ` : ''}{status}
      </Text>
      {settings.unit !== 'deg' && displayed && !isLevel && ratio ? (
        <Text variant="caption" color={AR_COLORS.textDim}>{ratio}{t('arTools.level.fallSuffix')} · {formatSlope(displayed.tiltDeg, settings.unit === 'pct' ? 'mmPerM' : 'pct')}</Text>
      ) : null}
      {zeroNotice || hasZero ? <Text variant="caption" color={AR_COLORS.brandText}>{t(zeroNotice ? 'arTools.level.zeroSet' : 'arTools.level.relativeZero')}</Text> : null}
    </View>
  );

  return (
    <View style={styles.fill}>
      <Animated.View
        style={[
          styles.frame,
          {
            width: frameW,
            height: frameH,
            left: (width - frameW) / 2,
            top: insetY + topReserve + (availableH - frameH) / 2,
          },
          animatedFrameStyle,
        ]}
      >
        {onClose && onChangeMode ? (
          <ArTopBar
            mode="level"
            onChangeMode={onChangeMode}
            onClose={onClose}
            right={{
              icon: settings.sound ? 'volume-high-outline' : 'volume-mute-outline',
              label: t(settings.sound ? 'arTools.level.soundOff' : 'arTools.level.soundOn'),
              onPress: toggleSound,
              active: settings.sound,
            }}
          />
        ) : onClose ? (
          <View style={styles.standaloneBar}>
            <GlassIconButton icon="close" label={t('common.close')} onPress={onClose} />
            <View style={styles.standaloneTitle}>
              <Text variant="label" color="#FFFFFF">
                {t('arTools.modeLevel')}
              </Text>
            </View>
            <GlassIconButton
              icon={settings.sound ? 'volume-high-outline' : 'volume-mute-outline'}
              label={t(settings.sound ? 'arTools.level.soundOff' : 'arTools.level.soundOn')}
              onPress={toggleSound}
              active={settings.sound}
            />
          </View>
        ) : null}
        {!longEdge ? (
          <>
            <View style={styles.orientationRow}><View style={styles.orientationChip}><Ionicons name={plumb ? 'phone-portrait-outline' : 'phone-landscape-outline'} color={AR_COLORS.textSoft} size={14} /><Text variant="caption" color={AR_COLORS.textSoft}>{t(`arTools.level.orientation.${shownOrientation}`)}</Text></View></View>
            <View style={styles.stage}>
              {showBullseye ? (
                <BullseyeVial size={bezelSize} offsetX={offset.x} offsetY={offset.y} isLevel={isLevel} />
              ) : (
                <View style={{ width: portraitBoxHeight, height: portraitBoxWidth, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: portraitBoxWidth, height: portraitBoxHeight, transform: [{ rotate: '90deg' }] }}>
                    <BoxLevelVial width={portraitBoxWidth} angleDeg={displayed?.angleDeg ?? 0} isLevel={isLevel} />
                  </View>
                </View>
              )}
            </View>
            {numbers}
            {shownOrientation === 'flat' && !compact ? (
              <View style={styles.axisRow}>
                {(['rollDeg', 'pitchDeg'] as const).map((axis) => <View key={axis} style={styles.axisChip}><Text variant="caption" color={AR_COLORS.textDim} style={styles.axisLabel}>{t(axis === 'rollDeg' ? 'arTools.level.roll' : 'arTools.level.pitch')}</Text><Text variant="bodyMedium" color="#FFFFFF">{displayed ? formatDegrees(displayed[axis]) : '—'}</Text></View>)}
              </View>
            ) : null}
            <View style={[styles.tray, compact && { marginTop: 10 }]}>{uprightStyleSwitch}{units}{tools}</View>
          </>
        ) : (
          <>
            <View style={styles.boxStage}><BoxLevelVial width={Math.min(frameW - 48, 830)} angleDeg={displayed?.angleDeg ?? 0} isLevel={isLevel} /></View>
            <View style={styles.landscapeBottom}>
              {numbers}
              <View style={styles.landscapeControls}>{tools}{units}</View>
            </View>
            <View style={styles.edgeRow}><View style={[styles.orientationChip, styles.edgeChip]}><Ionicons name="phone-landscape-outline" size={14} color={AR_COLORS.brandText} /><Text variant="caption" color={AR_COLORS.brandText}>{t(`arTools.level.orientation.${shownOrientation}`)}</Text></View><Text variant="caption" color={AR_COLORS.textDim}>{t('arTools.level.upright')}</Text></View>
          </>
        )}
        {shownOrientation !== 'flat' ? <View style={styles.surfaceEdge} /> : null}
      </Animated.View>
    </View>
  );
}

function ToolButton({ icon, label, active, disabled, onPress, vibrate }: {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
  vibrate?: boolean;
}) {
  const color = active ? AR_COLORS.brandText : '#FFFFFF';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active, disabled: !!disabled }} disabled={disabled} onPress={onPress} style={[styles.tool, active && styles.toolActive, disabled && { opacity: 0.35 }]}>{vibrate ? <MaterialCommunityIcons name="vibrate" size={22} color={color} /> : <Ionicons name={icon!} size={22} color={color} />}<Text variant="caption" color={active ? AR_COLORS.brandText : AR_COLORS.textSoft}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: AR_COLORS.bg },
  standaloneBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 40,
  },
  standaloneTitle: { flex: 1, alignItems: 'center' },
  frame: { position: 'absolute', alignItems: 'stretch', paddingTop: 4, paddingBottom: 8 },
  orientationRow: { alignItems: 'center', paddingTop: 14 },
  orientationChip: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: AR_COLORS.pill, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 100 },
  readouts: { alignItems: 'center', gap: 3 },
  readout: { fontSize: 64, lineHeight: 76, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  readoutCompact: { fontSize: 42, lineHeight: 50, letterSpacing: -1 },
  mmReadout: { fontSize: 42, lineHeight: 52, letterSpacing: -1 },
  status: { textAlign: 'center', paddingHorizontal: 12 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: AR_COLORS.brandSoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  axisRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 14 },
  axisChip: { alignItems: 'center', minWidth: 108, paddingHorizontal: 16, paddingVertical: 8, gap: 1, borderRadius: 12, backgroundColor: AR_COLORS.pill },
  axisLabel: { fontSize: 10, letterSpacing: 1.5 },
  tray: { marginHorizontal: 16, marginTop: 24, padding: 12, gap: 12, alignItems: 'center', borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: AR_COLORS.pillBorder },
  units: { flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: AR_COLORS.pill },
  unit: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 999, minWidth: 68, alignItems: 'center' },
  unitActive: { backgroundColor: '#FFFFFF' },
  tools: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  tool: { width: 72, minHeight: 62, paddingVertical: 8, justifyContent: 'center', alignItems: 'center', gap: 4, borderRadius: 16, backgroundColor: AR_COLORS.pill, borderWidth: 1, borderColor: AR_COLORS.pillBorder },
  toolActive: { backgroundColor: AR_COLORS.brandSoft, borderColor: AR_COLORS.brandBorder },
  boxStage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  landscapeBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  edgeReadouts: { alignItems: 'flex-start', flex: 1 },
  landscapeControls: { alignItems: 'center', gap: 8 },
  edgeRow: { flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', paddingTop: 10 },
  edgeChip: { backgroundColor: AR_COLORS.brandSoft, borderWidth: 1, borderColor: AR_COLORS.brandBorder },
  surfaceEdge: { position: 'absolute', left: '12%', right: '12%', bottom: 0, height: 3, borderRadius: 2, backgroundColor: AR_COLORS.brand, shadowColor: AR_COLORS.brand, shadowOpacity: 1, shadowRadius: 10, elevation: 4 },
});

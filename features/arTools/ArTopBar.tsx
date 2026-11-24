import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';

import { AR_COLORS, type ArToolMode } from './arChrome';

type ArTopBarProps = {
  mode: ArToolMode;
  onChangeMode: (mode: ArToolMode) => void;
  onClose: () => void;
  /** Right-hand glass button: help on Measure, sound on Level. */
  right?: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; active?: boolean };
  style?: StyleProp<ViewStyle>;
  /** `light` glass reads best over a camera feed; `dark` over the level's metal. */
  tone?: 'light' | 'dark';
};

/** Close · Measure | Level · help/sound — the one top row shared by every AR tool. */
export function ArTopBar({ mode, onChangeMode, onClose, right, style, tone = 'dark' }: ArTopBarProps) {
  const { t } = useI18n();
  const light = tone === 'light';
  return (
    <View style={[styles.row, style]}>
      <GlassIconButton icon="close" label={t('common.close')} onPress={onClose} light={light} />
      <View style={[styles.switcher, light && styles.switcherLight]} accessibilityRole="tablist">
        <ModeTab
          label={t('arTools.modeMeasure')}
          icon="resize-outline"
          selected={mode === 'measure'}
          light={light}
          onPress={() => onChangeMode('measure')}
        />
        <ModeTab
          label={t('arTools.modeLevel')}
          icon="remove-outline"
          selected={mode === 'level'}
          light={light}
          onPress={() => onChangeMode('level')}
        />
      </View>
      {right ? (
        <GlassIconButton icon={right.icon} label={right.label} onPress={right.onPress} active={right.active} light={light} />
      ) : (
        <View style={styles.iconSpacer} />
      )}
    </View>
  );
}

function ModeTab({
  label,
  icon,
  selected,
  light,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  selected: boolean;
  light: boolean;
  onPress: () => void;
}) {
  const selectedBg = light ? AR_COLORS.ink : '#FFFFFF';
  const color = selected ? (light ? '#FFFFFF' : AR_COLORS.ink) : light ? AR_COLORS.ink : AR_COLORS.textSoft;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, selected && { backgroundColor: selectedBg }]}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      hitSlop={4}
    >
      <Ionicons name={icon} size={15} color={color} />
      <Text variant="label" color={color}>
        {label}
      </Text>
    </Pressable>
  );
}

export function GlassIconButton({
  icon,
  label,
  onPress,
  active,
  light,
  size = 40,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  active?: boolean;
  light?: boolean;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active === undefined ? undefined : { selected: active }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        light && styles.iconButtonLight,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={icon} size={20} color={light ? AR_COLORS.ink : '#FFFFFF'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 40,
  },
  switcher: {
    flexDirection: 'row',
    padding: 4,
    gap: 2,
    borderRadius: 999,
    backgroundColor: AR_COLORS.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AR_COLORS.glassBorder,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 999,
  },
  switcherLight: {
    backgroundColor: AR_COLORS.lightGlass,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AR_COLORS.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AR_COLORS.glassBorder,
  },
  iconButtonLight: {
    backgroundColor: AR_COLORS.lightGlass,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  iconSpacer: { width: 40, height: 40 },
});

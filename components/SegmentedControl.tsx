import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

type Segment = {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Optional leading mark (e.g. presence tick on Jobs). */
  leading?: React.ReactNode;
};

type SegmentedControlProps = {
  segments: Segment[];
  value: string;
  onChange: (key: string) => void;
  /** Icon-only control that hug its content instead of stretching full width. */
  iconsOnly?: boolean;
  /**
   * `accent` — green active pill (legacy).
   * `surface` — white active pill on sunken track (Figma Documents tabs).
   */
  tone?: 'accent' | 'surface';
  style?: StyleProp<ViewStyle>;
};

export function SegmentedControl({
  segments,
  value,
  onChange,
  iconsOnly = false,
  tone = 'accent',
  style,
}: SegmentedControlProps) {
  const { colors, radius, shadows } = useTheme();
  const activeBg = tone === 'surface' ? colors.surface : colors.accent;
  const activeFg = tone === 'surface' ? colors.textPrimary : colors.accentOnAccent;

  const trackBg = tone === 'accent' ? colors.accentSoft : colors.surfaceSunken;

  return (
    <View
      style={[
        styles.container,
        iconsOnly ? styles.containerIcons : null,
        {
          backgroundColor: trackBg,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {segments.map((segment) => {
        const active = segment.key === value;
        return (
          <Pressable
            key={segment.key}
            onPress={() => onChange(segment.key)}
            accessibilityRole="tab"
            accessibilityLabel={segment.label}
            accessibilityState={{ selected: active }}
            style={[
              styles.segment,
              iconsOnly ? styles.segmentIcon : null,
              {
                borderRadius: radius.pill,
                backgroundColor: active ? activeBg : 'transparent',
              },
              active && tone === 'surface' ? shadows.card : active ? shadows.subtle : null,
            ]}
          >
            {segment.leading ?? null}
            {segment.icon ? (
              <Ionicons
                name={segment.icon}
                size={18}
                color={active ? activeFg : colors.textSecondary}
              />
            ) : null}
            {!iconsOnly || !segment.icon ? (
              <Text
                variant="bodyMedium"
                color={active ? activeFg : colors.textSecondary}
                style={active ? styles.activeLabel : undefined}
              >
                {segment.label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    height: 44,
  },
  containerIcons: {
    alignSelf: 'flex-end',
    height: 40,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentIcon: {
    flex: 0,
    width: 40,
    gap: 0,
  },
  activeLabel: {
    fontFamily: 'Lexend_600SemiBold',
  },
});
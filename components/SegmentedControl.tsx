import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

type Segment = {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
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
};

export function SegmentedControl({
  segments,
  value,
  onChange,
  iconsOnly = false,
  tone = 'accent',
}: SegmentedControlProps) {
  const { colors, radius, shadows } = useTheme();
  const activeBg = tone === 'surface' ? colors.surface : colors.accent;
  const activeFg = tone === 'surface' ? colors.textPrimary : colors.accentOnAccent;

  return (
    <View
      style={[
        styles.container,
        iconsOnly ? styles.containerIcons : null,
        { backgroundColor: colors.surfaceSunken, borderRadius: radius.pill },
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
              active && tone === 'surface' ? shadows.subtle : null,
            ]}
          >
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
                style={active && tone === 'surface' ? { fontFamily: 'Lexend_600SemiBold' } : undefined}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentIcon: {
    flex: 0,
    width: 40,
  },
});

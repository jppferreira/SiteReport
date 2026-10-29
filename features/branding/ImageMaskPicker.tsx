import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Polygon, Rect } from 'react-native-svg';

import { Text } from '@/components';
import { imageMaskPoints, REPORT_IMAGE_MASKS, ReportImageMask, reportImageMaskLabel } from '@/models';
import { useTheme } from '@/theme';

type ImageMaskPickerProps = {
  value: ReportImageMask;
  onChange: (mask: ReportImageMask) => void;
};

export function ImageMaskPicker({ value, onChange }: ImageMaskPickerProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={[styles.row, { gap: spacing.sm }]}>
      {REPORT_IMAGE_MASKS.map((mask) => {
        const selected = mask === value;
        const points = imageMaskPoints(mask, 'band')
          .map(([x, y]) => `${x},${y * 0.72}`)
          .join(' ');
        return (
          <Pressable
            key={mask}
            onPress={() => onChange(mask)}
            accessibilityRole="button"
            accessibilityLabel={`${reportImageMaskLabel(mask)} photo edge`}
            accessibilityState={{ selected }}
            style={styles.choice}
          >
            <View
              style={[
                styles.thumb,
                {
                  borderRadius: radius.md,
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Svg viewBox="0 0 100 72" width="100%" height="100%">
                <Rect width="100" height="72" fill="#121614" />
                <Polygon points={points} fill={selected ? colors.accent : '#3D4741'} />
              </Svg>
            </View>
            <Text
              variant="caption"
              color={selected ? colors.textPrimary : colors.textSecondary}
              numberOfLines={1}
              style={{ marginTop: 4, textAlign: 'center' }}
            >
              {reportImageMaskLabel(mask)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  choice: { flex: 1, minWidth: 0 },
  thumb: { height: 52, borderWidth: 1.5, overflow: 'hidden' },
});

import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { COVER_DESIGNS, CoverDesignId } from '@/models';
import { useTheme } from '@/theme';

type CoverDesignPickerProps = {
  value: CoverDesignId;
  onChange: (id: CoverDesignId) => void;
  accentColor?: string;
};

export function CoverDesignPicker({ value, onChange, accentColor = '#1FA84A' }: CoverDesignPickerProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}>
        {COVER_DESIGNS.map((design) => {
          const active = design.id === value;
          return (
            <Pressable
              key={design.id}
              onPress={() => onChange(design.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${design.label}. ${design.description}`}
              style={[
                styles.card,
                {
                  borderRadius: radius.md,
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <CoverThumb id={design.id} accent={accentColor} />
              <Text variant="bodyMedium" color={colors.textPrimary} numberOfLines={1} style={{ marginTop: spacing.xs }}>
                {design.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function CoverThumb({ id, accent }: { id: CoverDesignId; accent: string }) {
  if (id === 'bleed') {
    return (
      <View style={[styles.page, styles.photoFill]}>
        <View style={styles.bleedTop}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Bar width="46%" height={3} color="rgba(255,255,255,0.7)" />
        </View>
        <View style={styles.bleedBottom}>
          <Bar width="78%" height={6} color="#FFFFFF" />
          <Bar width="52%" height={3} color={accent} />
        </View>
      </View>
    );
  }

  if (id === 'split') {
    return (
      <View style={[styles.page, styles.row]}>
        <View style={styles.splitCopy}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Bar width="80%" height={5} color="#FFFFFF" />
          <Bar width="100%" />
          <Bar width="70%" />
        </View>
        <View style={styles.splitPhoto} />
      </View>
    );
  }

  if (id === 'poster') {
    return (
      <View style={styles.page}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <Bar width="88%" height={7} color="#FFFFFF" />
        <Bar width="62%" height={7} color={accent} />
        <View style={styles.posterPhoto} />
        <Bar width="40%" />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <Bar width="70%" height={5} color="#FFFFFF" />
      <Bar width="46%" height={2} color={accent} />
      <View style={styles.band} />
      <Bar width="80%" />
    </View>
  );
}

function Bar({ width, height = 3, color = 'rgba(255,255,255,0.45)' }: { width: number | `${number}%`; height?: number; color?: string }) {
  return <View style={{ width, height, borderRadius: 2, backgroundColor: color }} />;
}

const styles = StyleSheet.create({
  card: { width: 132, borderWidth: 1.5, padding: 8 },
  page: {
    height: 88,
    borderRadius: 4,
    backgroundColor: '#121614',
    padding: 8,
    gap: 4,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', padding: 0, gap: 0 },
  dot: { width: 8, height: 8, borderRadius: 2 },
  band: { flex: 1, marginHorizontal: -8, backgroundColor: '#6E7872' },
  photoFill: { padding: 8, backgroundColor: '#6E7872', justifyContent: 'space-between' },
  bleedTop: { gap: 4 },
  bleedBottom: { gap: 4 },
  splitCopy: { width: '46%', padding: 6, gap: 4, backgroundColor: '#121614' },
  splitPhoto: { flex: 1, backgroundColor: '#6E7872' },
  posterPhoto: {
    flex: 1,
    marginTop: 2,
    backgroundColor: '#6E7872',
    borderTopLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
});

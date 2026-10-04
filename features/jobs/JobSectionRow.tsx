import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { StatusBadge, Text } from '@/components';
import { JobSectionStatus } from '@/models';
import { useTheme } from '@/theme';

type JobSectionRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  status: JobSectionStatus;
  onPress: () => void;
};

export function JobSectionRow({ icon, title, subtitle, status, onPress }: JobSectionRowProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${statusLabel(status)}`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: status === 'complete' ? colors.accentSoft : colors.surfaceSunken, borderRadius: radius.md },
        ]}
      >
        <Ionicons name={icon} size={20} color={status === 'complete' ? colors.accentPressed : colors.textSecondary} />
      </View>
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text variant="bodyMedium">{title}</Text>
        {subtitle ? (
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <StatusBadge label={statusLabel(status)} tone={statusTone(status)} />
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={{ marginLeft: spacing.xs }} />
    </Pressable>
  );
}

function statusLabel(status: JobSectionStatus): string {
  if (status === 'complete') return 'Complete';
  if (status === 'in_progress') return 'In progress';
  return 'Not started';
}

function statusTone(status: JobSectionStatus): 'success' | 'accent' | 'neutral' {
  if (status === 'complete') return 'success';
  if (status === 'in_progress') return 'accent';
  return 'neutral';
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 68,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

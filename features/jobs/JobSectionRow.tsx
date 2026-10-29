import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { JobSectionStatus } from '@/models';
import { useTheme } from '@/theme';

type JobSectionRowProps = {
  title: string;
  subtitle?: string;
  status: JobSectionStatus;
  onPress: () => void;
  showDivider?: boolean;
};

export function JobSectionRow({ title, subtitle, status, onPress, showDivider = false }: JobSectionRowProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const complete = status === 'complete';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('jobs.sectionRowA11y', {
        title,
        status: complete ? t('common.complete') : t('common.notComplete'),
      })}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: colors.border,
          borderBottomWidth: showDivider ? StyleSheet.hairlineWidth : 0,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.circle,
          complete
            ? { backgroundColor: colors.accent, borderColor: colors.accent }
            : { backgroundColor: 'transparent', borderColor: colors.borderStrong },
        ]}
      >
        {complete ? <Ionicons name="checkmark" size={16} color={colors.accentOnAccent} /> : null}
      </View>
      <View style={styles.copy}>
        <Text variant="bodyMedium">{title}</Text>
        {subtitle ? (
          <Text variant="caption" color={colors.textSecondary} numberOfLines={2} style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
});

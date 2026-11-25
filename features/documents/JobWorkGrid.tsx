import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { DocProBadge } from './DocProBadge';

export type JobWorkTileId =
  | 'photos'
  | 'measure'
  | 'checklist'
  | 'notes'
  | 'signature'
  | 'details';

type TileDef = {
  id: JobWorkTileId;
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  pro?: boolean;
};

const TILES: TileDef[] = [
  { id: 'photos', icon: 'camera-outline', labelKey: 'documents.workPhotos' },
  { id: 'measure', icon: 'resize-outline', labelKey: 'documents.workMeasure' },
  { id: 'checklist', icon: 'checkbox-outline', labelKey: 'documents.workChecklist', pro: true },
  { id: 'notes', icon: 'create-outline', labelKey: 'documents.workNotes' },
  { id: 'signature', icon: 'pencil-outline', labelKey: 'documents.workSignature' },
  { id: 'details', icon: 'information-circle-outline', labelKey: 'documents.workDetails' },
];

type JobWorkGridProps = {
  onPress: (id: JobWorkTileId) => void;
  summaries?: Partial<Record<JobWorkTileId, string>>;
};

export function JobWorkGrid({ onPress, summaries }: JobWorkGridProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="bodyMedium">{t('documents.jobWorkTitle')}</Text>
      <View style={styles.grid}>
        {TILES.map((tile) => (
          <Pressable
            key={tile.id}
            onPress={() => onPress(tile.id)}
            accessibilityRole="button"
            accessibilityLabel={t(tile.labelKey)}
            style={[
              styles.tile,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: 16,
                paddingTop: 11,
                paddingHorizontal: 12,
                paddingBottom: 10,
                height: 84,
              },
            ]}
          >
            <View style={styles.iconRow}>
              <Ionicons name={tile.icon} size={19} color={colors.textPrimary} />
              {tile.pro ? <DocProBadge compact /> : null}
            </View>
            <Text variant="bodySmall" style={[styles.label, { marginTop: 4 }]} numberOfLines={1}>
              {t(tile.labelKey)}
            </Text>
            {summaries?.[tile.id] ? (
              <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                {summaries[tile.id]}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 11,
  },
  tile: {
    width: '31%',
    minWidth: 104,
    flexGrow: 1,
    flexBasis: '30%',
    borderWidth: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  label: {
    fontWeight: '600',
    fontSize: 13,
  },
});

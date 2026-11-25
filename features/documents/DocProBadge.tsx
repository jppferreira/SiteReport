import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';

import { DOC_PRO_BG } from './documentTokens';

type DocProBadgeProps = {
  compact?: boolean;
};

export function DocProBadge({ compact }: DocProBadgeProps) {
  const { t } = useI18n();

  return (
    <View style={[styles.badge, compact ? styles.compact : null, { backgroundColor: DOC_PRO_BG }]}>
      <Text variant="caption" color="#FFFFFF" style={styles.label}>
        {t('common.proBadge')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 7,
    height: 20,
    borderRadius: 6,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    paddingHorizontal: 6,
    height: 18,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    lineHeight: 12,
  },
});
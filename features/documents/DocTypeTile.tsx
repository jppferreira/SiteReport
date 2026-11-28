import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { DocumentKind } from '@/models';
import { useTheme } from '@/theme';

import { getDocTileBg } from './documentTokens';

const ICONS: Record<DocumentKind, keyof typeof Ionicons.glyphMap> = {
  quote: 'clipboard-outline',
  report: 'document-text-outline',
  invoice: 'receipt-outline',
};

type DocTypeTileProps = {
  kind: DocumentKind;
  size?: number;
};

export function DocTypeTile({ kind, size = 44 }: DocTypeTileProps) {
  const { colors, scheme } = useTheme();
  const iconSize = Math.round(size * 0.45);

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          backgroundColor: getDocTileBg(kind, scheme),
        },
      ]}
    >
      <Ionicons name={ICONS[kind]} size={iconSize} color={colors.docTileIcon} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
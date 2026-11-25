import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { DocumentKind } from '@/models';

import { DOC_KIND_TILE_BG } from './documentTokens';

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
  const iconSize = Math.round(size * 0.45);

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          backgroundColor: DOC_KIND_TILE_BG[kind],
        },
      ]}
    >
      <Ionicons name={ICONS[kind]} size={iconSize} color="#121412" />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
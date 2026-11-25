import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { DOC_KIND_TILE_BG } from '@/features/documents/documentTokens';
import type { DocumentKind } from '@/models';

const LABEL: Record<DocumentKind, string> = {
  quote: 'Q',
  report: 'R',
  invoice: 'I',
};

const ON_FG: Record<DocumentKind, string> = {
  quote: '#2F6FBF',
  report: '#178A3C',
  invoice: '#6B4CA0',
};

const OFF_BG = '#F2F4F2';
const OFF_FG = '#8E9791';

type JobPipProps = {
  kind: DocumentKind;
  on: boolean;
};

export function JobPip({ kind, on }: JobPipProps) {
  return (
    <View
      style={[
        styles.pip,
        { backgroundColor: on ? DOC_KIND_TILE_BG[kind] : OFF_BG },
      ]}
    >
      <Text
        variant="caption"
        color={on ? ON_FG[kind] : OFF_FG}
        style={styles.label}
      >
        {LABEL[kind]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pip: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Lexend_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
  },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { getDocTileBg } from '@/features/documents/documentTokens';
import type { DocumentKind } from '@/models';
import { useTheme } from '@/theme';

const LABEL: Record<DocumentKind, string> = {
  quote: 'Q',
  report: 'R',
  invoice: 'I',
};

type JobPipProps = {
  kind: DocumentKind;
  on: boolean;
};

export function JobPip({ kind, on }: JobPipProps) {
  const { colors, scheme } = useTheme();

  const onColor = (() => {
    switch (kind) {
      case 'quote':
        return colors.pipQuote;
      case 'report':
        return colors.pipReport;
      case 'invoice':
        return colors.pipInvoice;
      default:
        return colors.textPrimary;
    }
  })();

  return (
    <View
      style={[
        styles.pip,
        { backgroundColor: on ? getDocTileBg(kind, scheme) : colors.pipOffBg },
      ]}
    >
      <Text
        variant="caption"
        color={on ? onColor : colors.pipOffFg}
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

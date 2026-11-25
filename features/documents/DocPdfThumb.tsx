import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LocalImage, Text } from '@/components';
import type { DocumentKind } from '@/models';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { DOC_KIND_TILE_BG } from './documentTokens';
import { DocTypeTile } from './DocTypeTile';

const THUMB_W = 84;
const THUMB_H = 112;

type DocPdfThumbProps = {
  kind: DocumentKind;
  pdfUri?: string | null;
  onPress?: () => void;
};

export function DocPdfThumb({ kind, pdfUri, onPress }: DocPdfThumbProps) {
  const { colors, radius, shadows } = useTheme();
  const { t } = useI18n();

  const pillKey =
    kind === 'invoice'
      ? 'costs.invoicePill'
      : kind === 'quote'
        ? 'documents.kindPillQuote'
        : 'documents.kindPillReport';
  const pillLabel = t(pillKey);

  const body = (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          width: THUMB_W,
          height: THUMB_H,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.stub, { backgroundColor: DOC_KIND_TILE_BG[kind] }]}>
        <Text variant="caption" color={colors.textSecondary} style={styles.stubLabel}>
          {pillLabel}
        </Text>
      </View>
      <View style={styles.preview}>
        {pdfUri ? (
          <LocalImage uri={pdfUri} style={styles.image} contentFit="cover" />
        ) : (
          <DocTypeTile kind={kind} size={44} />
        )}
      </View>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t('common.preview')}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  stub: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stubLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  preview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
});
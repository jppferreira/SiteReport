import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet, Text } from '@/components';
import type { DocumentKind } from '@/models';
import { documentRequiresPro } from '@/models';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { DocProBadge } from './DocProBadge';
import { DocTypeTile } from './DocTypeTile';
import { DOC_KIND_TILE_BG } from './documentTokens';

type NewDocumentSheetProps = {
  visible: boolean;
  isPro: boolean;
  onClose: () => void;
  onSelect: (kind: DocumentKind) => void;
  onLocked: () => void;
};

const OPTIONS: { kind: DocumentKind; labelKey: string; hintKey: string }[] = [
  { kind: 'quote', labelKey: 'documents.kindQuote', hintKey: 'documents.newQuoteHint' },
  { kind: 'report', labelKey: 'documents.kindReport', hintKey: 'documents.newReportHint' },
  { kind: 'invoice', labelKey: 'documents.kindInvoice', hintKey: 'documents.newInvoiceHint' },
];

export function NewDocumentSheet({ visible, isPro, onClose, onSelect, onLocked }: NewDocumentSheetProps) {
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();

  const pick = (kind: DocumentKind) => {
    if (documentRequiresPro(kind) && !isPro) {
      onLocked();
      return;
    }
    onClose();
    onSelect(kind);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text variant="h3" style={{ marginBottom: spacing.md }}>
        {t('documents.newSheetTitle')}
      </Text>
      <View style={{ gap: spacing.sm }}>
        {OPTIONS.map((opt) => {
          const locked = documentRequiresPro(opt.kind) && !isPro;
          return (
            <Pressable
              key={opt.kind}
              onPress={() => pick(opt.kind)}
              style={[
                styles.option,
                {
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                  backgroundColor: DOC_KIND_TILE_BG[opt.kind],
                },
              ]}
            >
              <DocTypeTile kind={opt.kind} />
              <View style={[styles.optionText, { marginLeft: spacing.md }]}>
                <View style={styles.labelRow}>
                  <Text variant="bodyMedium">{t(opt.labelKey)}</Text>
                  {documentRequiresPro(opt.kind) ? <DocProBadge compact /> : null}
                </View>
                <Text variant="caption" color={colors.textSecondary}>
                  {t(opt.hintKey)}
                </Text>
              </View>
              {locked ? (
                <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              )}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  optionText: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
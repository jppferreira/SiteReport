import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet, Button, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

type DidYouSendItSheetProps = {
  visible: boolean;
  documentNumber: string | null;
  loading?: boolean;
  onClose: () => void;
  onConfirmSent: () => void;
};

/** Post-share confirm: system share cannot prove delivery, so the trader marks sent. */
export function DidYouSendItSheet({
  visible,
  documentNumber,
  loading,
  onClose,
  onConfirmSent,
}: DidYouSendItSheetProps) {
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();
  const numberLabel = documentNumber?.trim() || t('documents.kindInvoice');

  return (
    <BottomSheet visible={visible} onClose={onClose} dragHandleOnly>
      <View style={{ gap: spacing.md }}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]}>
            <Ionicons name="paper-plane-outline" size={22} color={colors.accentPressed} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="h3">{t('documents.didYouSendTitle')}</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('documents.didYouSendSubtitle', { number: numberLabel })}
            </Text>
          </View>
        </View>

        <Text variant="body" color={colors.textSecondary}>
          {t('documents.didYouSendBody')}
        </Text>

        <Button
          label={t('documents.didYouSendConfirm')}
          variant="accent"
          icon={<Ionicons name="checkmark" size={20} color={colors.textInverse} />}
          onPress={onConfirmSent}
          loading={loading}
          disabled={loading}
        />
        <Button
          label={t('documents.didYouSendNotYet')}
          variant="secondary"
          onPress={onClose}
          disabled={loading}
        />

        <View style={styles.hintRow}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
          <Text variant="caption" color={colors.textTertiary} style={{ flex: 1 }}>
            {t('documents.didYouSendHint')}
          </Text>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
});

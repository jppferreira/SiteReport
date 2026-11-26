import React, { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet, Button, Input, SegmentedControl, Text } from '@/components';
import { formatPence } from '@/models';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

type PaymentMethod = 'bank' | 'cash' | 'card';

type MarkPaidSheetProps = {
  visible: boolean;
  defaultAmountPence: number | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (opts: { amountPence: number; paidAt: string; method: PaymentMethod; thankYou: boolean }) => void;
};

export function MarkPaidSheet({ visible, defaultAmountPence, loading, onClose, onSubmit }: MarkPaidSheetProps) {
  const { spacing } = useTheme();
  const { t } = useI18n();
  const defaultAmount =
    defaultAmountPence != null ? (defaultAmountPence / 100).toFixed(2) : '';
  const [amount, setAmount] = useState(defaultAmount);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>('bank');

  const handleSubmit = () => {
    const cleaned = amount.replace(/[£,\s]/g, '');
    const [whole = '0', frac = ''] = cleaned.split('.');
    const pence = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
    const amountPence = Number.isFinite(pence) ? pence : defaultAmountPence ?? 0;
    // Thank-you email is not shipped yet — never offer it in the sheet.
    onSubmit({ amountPence, paidAt: paidDate, method, thankYou: false });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dragHandleOnly>
      <Text variant="h3" style={{ marginBottom: spacing.md }}>
        {t('documents.markPaidTitle')}
      </Text>
      {defaultAmountPence != null ? (
        <Text variant="caption" color="#5E6862" style={{ marginBottom: spacing.sm }}>
          {t('documents.markPaidDue', { amount: formatPence(defaultAmountPence) })}
        </Text>
      ) : null}
      <Input label={t('documents.markPaidAmount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <View style={{ marginTop: spacing.md }}>
        <Input label={t('documents.markPaidDate')} value={paidDate} onChangeText={setPaidDate} />
      </View>
      <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
        <Text variant="label">{t('documents.markPaidMethod')}</Text>
        <SegmentedControl
          segments={[
            { key: 'bank', label: t('documents.methodBank') },
            { key: 'cash', label: t('documents.methodCash') },
            { key: 'card', label: t('documents.methodCard') },
          ]}
          value={method}
          onChange={(key) => setMethod(key as PaymentMethod)}
        />
      </View>
      <View style={{ marginTop: spacing.lg }}>
        <Button label={t('documents.markPaidConfirm')} onPress={handleSubmit} loading={loading} disabled={loading} />
      </View>
    </BottomSheet>
  );
}
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { formatPence } from '@/models';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import type { DocumentSegment } from './filterDocuments';

type DocumentsSummaryCardProps = {
  segment: DocumentSegment;
  outstandingPence: number;
  unpaidCount?: number;
  overdueCount?: number;
  overduePence?: number;
  paidMonthPence?: number;
  waitingCount: number;
  waitingPence: number;
  sentCount?: number;
  expiresSoonCount?: number;
  acceptedPence?: number;
};

export function DocumentsSummaryCard({
  segment,
  outstandingPence,
  unpaidCount = 0,
  overdueCount = 0,
  overduePence = 0,
  paidMonthPence = 0,
  waitingCount,
  waitingPence,
  sentCount = 0,
  expiresSoonCount = 0,
  acceptedPence = 0,
}: DocumentsSummaryCardProps) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const isInvoice = segment === 'invoice';

  return (
    <View style={[styles.card, { backgroundColor: colors.ctaDark, padding: spacing.md }]}>
      {isInvoice ? (
        <>
          <Text variant="caption" color="rgba(255,255,255,0.55)" style={styles.label}>
            {t('documents.summaryOutstanding')}
          </Text>
          <Text variant="display" color={colors.textInverse} style={styles.amount}>
            {formatPence(outstandingPence)}
          </Text>
          <View style={styles.stats}>
            <Text variant="caption" color="rgba(255,255,255,0.72)">
              {t('documents.summaryUnpaidCount', { count: unpaidCount })}
            </Text>
            {overdueCount > 0 ? (
              <Text variant="caption" color="#FF8B8B">
                {t('documents.summaryOverdueStat', {
                  count: overdueCount,
                  amount: formatPence(overduePence),
                })}
              </Text>
            ) : null}
            {paidMonthPence > 0 ? (
              <Text variant="caption" color="#7DDB9A">
                {t('documents.summaryPaidMonth', { amount: formatPence(paidMonthPence) })}
              </Text>
            ) : null}
          </View>
        </>
      ) : (
        <>
          <Text variant="caption" color="rgba(255,255,255,0.55)" style={styles.label}>
            {t('documents.summaryWaiting')}
          </Text>
          <Text variant="display" color={colors.textInverse} style={styles.amount}>
            {formatPence(waitingPence)}
          </Text>
          <View style={styles.stats}>
            <Text variant="caption" color="rgba(255,255,255,0.72)">
              {t('documents.summarySentCount', { count: sentCount || waitingCount })}
            </Text>
            {expiresSoonCount > 0 ? (
              <Text variant="caption" color="#F0C674">
                {t('documents.summaryExpiresSoon', { count: expiresSoonCount })}
              </Text>
            ) : null}
            {acceptedPence > 0 ? (
              <Text variant="caption" color="#7DDB9A">
                {t('documents.summaryAcceptedAmount', { amount: formatPence(acceptedPence) })}
              </Text>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    gap: 6,
  },
  label: {
    fontWeight: '500',
  },
  amount: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    fontFamily: 'Lexend_600SemiBold',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
});

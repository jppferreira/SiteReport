import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components';
import { effectiveStatus, formatPence, isOverdue } from '@/models';
import { useTheme } from '@/theme';
import { formatDateShort } from '@/utils/format';

import { DocStatusBadge } from './DocStatusBadge';
import { DocTypeTile } from './DocTypeTile';
import type { DocumentWithJob } from './types';

type DocumentRowProps = {
  item: DocumentWithJob;
  onPress: () => void;
};

function titleLine(item: DocumentWithJob): string {
  const doc = item.document;
  const number = doc.number?.trim();
  const customer = item.job?.customerName?.trim();
  if (number && customer) return `${number} · ${customer}`;
  if (number) return number;
  if (customer) return customer;
  return doc.title?.trim() || doc.kind.charAt(0).toUpperCase() + doc.kind.slice(1);
}

function metaLine(item: DocumentWithJob): string {
  const doc = item.document;
  const job = item.job?.title?.trim();
  const bits: string[] = [];
  if (job) bits.push(job);

  if (doc.kind === 'invoice') {
    if (isOverdue(doc) && doc.dueDate) {
      const due = new Date(`${doc.dueDate.slice(0, 10)}T12:00:00`);
      const days = Math.max(1, Math.round((Date.now() - due.getTime()) / 86400000));
      bits.push(`${days} days late`);
    } else if (doc.status === 'paid' && doc.paidAt) {
      bits.push(`paid ${formatDateShort(doc.paidAt)}`);
    } else if (doc.dueDate) {
      bits.push(`due ${formatDateShort(doc.dueDate)}`);
    }
  } else if (doc.kind === 'quote') {
    const eff = effectiveStatus(doc);
    if (eff === 'draft') bits.push('not sent');
    else if (doc.sentAt) bits.push(`sent ${formatDateShort(doc.sentAt)}`);
    else if (doc.acceptedAt) bits.push(`accepted ${formatDateShort(doc.acceptedAt)}`);
  } else if (doc.updatedAt) {
    bits.push(formatDateShort(doc.updatedAt));
  }

  return bits.join(' · ') || '—';
}

export function DocumentRow({ item, onPress }: DocumentRowProps) {
  const { colors, spacing } = useTheme();
  const amount = useMemo(
    () => (item.document.totalPence != null ? formatPence(item.document.totalPence) : null),
    [item.document.totalPence]
  );

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <DocTypeTile kind={item.document.kind} />
        <View style={[styles.main, { marginLeft: spacing.md }]}>
          <View style={styles.titleRow}>
            <Text variant="bodyMedium" numberOfLines={1} style={styles.flex}>
              {titleLine(item)}
            </Text>
            {amount ? (
              <Text variant="bodyMedium" style={styles.amount}>
                {amount}
              </Text>
            ) : null}
          </View>
          <View style={[styles.metaRow, { marginTop: 4 }]}>
            <Text variant="caption" color={colors.textSecondary} numberOfLines={1} style={styles.flex}>
              {metaLine(item)}
            </Text>
            <DocStatusBadge document={item.document} />
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, borderRadius: 18 },
  row: { flexDirection: 'row', alignItems: 'center' },
  main: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  amount: { flexShrink: 0, fontFamily: 'Lexend_600SemiBold' },
});

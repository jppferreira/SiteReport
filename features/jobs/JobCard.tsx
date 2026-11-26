import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, LocalImage, Text } from '@/components';
import type { JobDocumentSummary } from '@/database/repositories/documentsRepository';
import { useI18n } from '@/i18n/useI18n';
import { DOCUMENT_KINDS, documentStatusLabel, effectiveStatus, type DocumentKind } from '@/models';
import { Job } from '@/models';
import { useTheme } from '@/theme';
import { formatDate } from '@/utils/format';

import { JobPip } from './JobPip';

type JobCardProps = {
  job: Job;
  thumbnailUri: string | null;
  documentSummary?: JobDocumentSummary | null;
  /** When set, show "Kind · Status" for that document on the card. */
  statusKind?: DocumentKind | null;
  onPress: () => void;
};

export function JobCard({
  job,
  thumbnailUri,
  documentSummary,
  statusKind = null,
  onPress,
}: JobCardProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();

  let status: string | null = null;
  if (statusKind) {
    const entry = documentSummary?.[statusKind];
    if (entry) {
      const kindLabel =
        statusKind === 'quote'
          ? t('jobs.segmentQuote')
          : statusKind === 'report'
            ? t('jobs.segmentReport')
            : t('jobs.segmentInvoice');
      const label = documentStatusLabel(
        statusKind,
        effectiveStatus({ kind: statusKind, status: entry.status, dueDate: null })
      );
      status = `${kindLabel} · ${label}`;
    }
  }

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View
          style={[
            styles.thumb,
            { backgroundColor: colors.surfaceSunken, borderRadius: radius.md, marginRight: spacing.md },
          ]}
        >
          {thumbnailUri ? (
            <LocalImage uri={thumbnailUri} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Ionicons name="image-outline" size={22} color={colors.textTertiary} />
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.top}>
            <Text variant="bodyMedium" numberOfLines={1} style={styles.title}>
              {job.title}
            </Text>
            <Text variant="caption" color={colors.textSecondary} style={styles.date}>
              {formatDate(job.jobDate)}
            </Text>
          </View>

          {job.customerName ? (
            <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={1} style={styles.meta}>
              {job.customerName}
            </Text>
          ) : null}

          {job.address ? (
            <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={1} style={styles.meta}>
              {job.address}
            </Text>
          ) : null}

          {DOCUMENT_KINDS.some((kind) => documentSummary?.[kind]) || status ? (
            <View style={styles.metaRow}>
              <View style={styles.pips}>
                {DOCUMENT_KINDS.filter((kind) => documentSummary?.[kind]).map((kind) => (
                  <JobPip key={kind} kind={kind} on />
                ))}
              </View>
              {status ? (
                <Text variant="caption" color={colors.textPrimary} numberOfLines={1} style={styles.status}>
                  {status}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 20,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumb: {
    width: 72,
    height: 72,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Lexend_600SemiBold',
    fontSize: 16,
  },
  date: {
    flexShrink: 0,
    fontSize: 12.5,
  },
  meta: {
    fontSize: 13.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  pips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  status: {
    flex: 1,
    minWidth: 0,
    textAlign: 'right',
    fontFamily: 'Lexend_500Medium',
    fontSize: 12.5,
  },
});

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import {
  documentStatusLabel,
  effectiveStatus,
  type DocumentKind,
  type TradeDocument,
} from '@/models';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { displayStatus, expiresSoon } from './filterDocuments';

type DocStatusBadgeProps = {
  document: Pick<TradeDocument, 'kind' | 'status' | 'dueDate' | 'validUntil'>;
  today?: string | Date;
};

type BadgeStyle = {
  bg: string;
  fg: string;
  dot: string;
  solid?: boolean;
};

export function DocStatusBadge({ document, today }: DocStatusBadgeProps) {
  const { t } = useI18n();
  const { colors, radius } = useTheme();

  const visual = useMemo(() => {
    const eff = displayStatus(document, today);
    const kind = document.kind as DocumentKind;
    if (eff === 'expires_soon') {
      return {
        label: t('documents.statusExpiresSoon'),
        style: { bg: colors.warningSoft, fg: colors.warning, dot: colors.warning } satisfies BadgeStyle,
      };
    }
    const status = effectiveStatus(document, today);
    const label =
      status === 'overdue'
        ? t('documents.statusOverdue')
        : documentStatusLabel(kind, status);
    return { label, style: paletteForStatus(status, colors) };
  }, [document, today, t, colors]);

  const { bg, fg, dot, solid } = visual.style;

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: radius.pill }]}>
      <View style={[styles.dot, { backgroundColor: solid ? fg : dot }]} />
      <Text variant="caption" color={fg} style={solid ? styles.solidText : styles.text}>
        {visual.label}
      </Text>
    </View>
  );
}

export function quoteShowsExpiresSoon(doc: TradeDocument, today?: string | Date): boolean {
  return expiresSoon(doc, 7, today);
}

function paletteForStatus(
  status: ReturnType<typeof effectiveStatus>,
  colors: ReturnType<typeof useTheme>['colors']
): BadgeStyle {
  switch (status) {
    case 'draft':
      return { bg: colors.surfaceSunken, fg: colors.textSecondary, dot: colors.textTertiary };
    case 'sent':
      return { bg: colors.docSentBlueSoft, fg: colors.docSentBlue, dot: colors.docSentBlue };
    case 'accepted':
      return { bg: colors.accentSoft, fg: colors.accent, dot: colors.accent };
    case 'declined':
      return { bg: colors.destructiveSoft, fg: colors.destructive, dot: colors.destructive };
    case 'unpaid':
      return { bg: colors.warningSoft, fg: colors.warning, dot: colors.warning };
    case 'overdue':
      return { bg: colors.destructive, fg: colors.docSolidLabel, dot: colors.docSolidLabel, solid: true };
    case 'paid':
      return { bg: colors.accent, fg: colors.accentOnAccent, dot: colors.accentOnAccent, solid: true };
    default:
      return { bg: colors.surfaceSunken, fg: colors.textSecondary, dot: colors.textTertiary };
  }
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontWeight: '600',
  },
  solidText: {
    fontWeight: '700',
  },
});
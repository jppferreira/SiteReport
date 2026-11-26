import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Text } from '@/components';
import { formatPence } from '@/models';
import { useI18n } from '@/i18n/useI18n';
import { useTheme, type ThemeScheme } from '@/theme';

import { DONUT_TRAY_DARK_SVG, DONUT_TRAY_LIGHT_SVG } from './donutTrays';
import type { DocumentSegment } from './filterDocuments';

type DocumentsSummaryCardProps = {
  segment: DocumentSegment;
  outstandingPence: number;
  waitingPence: number;
  /** Quotes */
  draftQuoteCount?: number;
  draftQuotePence?: number;
  awaitingQuoteCount?: number;
  awaitingQuotePence?: number;
  acceptedQuoteCount?: number;
  acceptedQuotePence?: number;
  declinedQuoteCount?: number;
  declinedQuotePence?: number;
  /** Invoices */
  draftInvoiceCount?: number;
  draftInvoicePence?: number;
  sentInvoiceCount?: number;
  sentInvoicePence?: number;
  awaitingPaymentCount?: number;
  awaitingPaymentPence?: number;
};

type Slice = {
  key: string;
  value: number;
  color: string;
};

/** WebView frame includes Figma tray shadow bleed. */
const DONUT_FRAME = 128;
/** Visible ring diameter inside the tray (matches Figma 304∶328 content ratio). */
const DONUT_RING = 106;
/** Hole diameter relative to ring — Figma tray hole ≈ 50% of outer tray / ~54% of slice. */
const DONUT_INNER_PCT = 54;
/** Gap between slices as a fraction of the full ring (tray shows through). */
const DONUT_GAP_FRAC = 0.028;

/**
 * Soft skeuomorphic fills from Trade Report Feature Concepts
 * (Top-down doughnut — Bills / Groceries / Travel / Other).
 */
const SLICE_LOOK: Record<string, string> = {
  draft: '#FFD0A6',
  sent: '#3D8DFF',
  awaiting: '#3D8DFF',
  accepted: '#89E3D8',
  declined: '#BBA7FF',
  awaitingPayment: '#E89D6D',
};

const CARD_LOOK = {
  light: {
    background: '#EAF2FA',
    label: 'rgba(18, 28, 48, 0.55)',
    amount: '#121C30',
    stat: 'rgba(18, 28, 48, 0.68)',
    dotBorder: 'rgba(18, 28, 48, 0.12)',
  },
  dark: {
    background: '#111C2E',
    label: 'rgba(255,255,255,0.55)',
    amount: '#FFFFFF',
    stat: 'rgba(255,255,255,0.72)',
    dotBorder: 'rgba(255,255,255,0.22)',
  },
} as const;

/**
 * Pie proportions follow document counts (same as the legend).
 * Mixing £ amounts with counts made £0 docs (e.g. awaiting) collapse to a sliver
 * next to priced accepted/sent docs — looked like “no fill”.
 */
function sliceWeight(count: number, _pence: number): number {
  return count > 0 ? count : 0;
}

export function DocumentsSummaryCard({
  segment,
  outstandingPence,
  waitingPence,
  draftQuoteCount = 0,
  draftQuotePence = 0,
  awaitingQuoteCount = 0,
  awaitingQuotePence = 0,
  acceptedQuoteCount = 0,
  acceptedQuotePence = 0,
  declinedQuoteCount = 0,
  declinedQuotePence = 0,
  draftInvoiceCount = 0,
  draftInvoicePence = 0,
  sentInvoiceCount = 0,
  sentInvoicePence = 0,
  awaitingPaymentCount = 0,
  awaitingPaymentPence = 0,
}: DocumentsSummaryCardProps) {
  const { spacing, scheme, shadows } = useTheme();
  const { t } = useI18n();
  const isInvoice = segment === 'invoice';
  const look = CARD_LOOK[scheme];

  const chartSlices = useMemo<Slice[]>(() => {
    const withLook = (key: string, count: number, pence: number): Slice | null => {
      const value = sliceWeight(count, pence);
      if (value <= 0) return null;
      return { key, value, color: SLICE_LOOK[key] ?? SLICE_LOOK.awaiting ?? '#3D8DFF' };
    };

    if (isInvoice) {
      return [
        withLook('draft', draftInvoiceCount, draftInvoicePence),
        withLook('sent', sentInvoiceCount, sentInvoicePence),
        withLook('awaitingPayment', awaitingPaymentCount, awaitingPaymentPence),
      ].filter((s): s is Slice => s != null);
    }

    // Non-overlapping quote statuses (matches list badges).
    return [
      withLook('draft', draftQuoteCount, draftQuotePence),
      withLook('awaiting', awaitingQuoteCount, awaitingQuotePence),
      withLook('accepted', acceptedQuoteCount, acceptedQuotePence),
      withLook('declined', declinedQuoteCount, declinedQuotePence),
    ].filter((s): s is Slice => s != null);
  }, [
    acceptedQuoteCount,
    acceptedQuotePence,
    awaitingPaymentCount,
    awaitingPaymentPence,
    awaitingQuoteCount,
    awaitingQuotePence,
    declinedQuoteCount,
    declinedQuotePence,
    draftInvoiceCount,
    draftInvoicePence,
    draftQuoteCount,
    draftQuotePence,
    isInvoice,
    sentInvoiceCount,
    sentInvoicePence,
  ]);

  const title = isInvoice ? t('documents.summaryOutstanding') : t('documents.summaryWaiting');
  const amount = isInvoice ? outstandingPence : waitingPence;

  const stats = isInvoice
    ? [
        draftInvoiceCount > 0
          ? { color: SLICE_LOOK.draft, text: t('documents.summaryDraftCount', { count: draftInvoiceCount }) }
          : null,
        sentInvoiceCount > 0
          ? { color: SLICE_LOOK.sent, text: t('documents.summarySentCount', { count: sentInvoiceCount }) }
          : null,
        awaitingPaymentCount > 0
          ? {
              color: SLICE_LOOK.awaitingPayment,
              text: t('documents.summaryAwaitingPaymentCount', { count: awaitingPaymentCount }),
            }
          : null,
      ]
    : [
        draftQuoteCount > 0
          ? { color: SLICE_LOOK.draft, text: t('documents.summaryDraftCount', { count: draftQuoteCount }) }
          : null,
        awaitingQuoteCount > 0
          ? {
              color: SLICE_LOOK.awaiting,
              text: t('documents.summaryAwaitingCount', { count: awaitingQuoteCount }),
            }
          : null,
        acceptedQuoteCount > 0
          ? {
              color: SLICE_LOOK.accepted,
              text: t('documents.summaryAcceptedCount', { count: acceptedQuoteCount }),
            }
          : null,
        declinedQuoteCount > 0
          ? {
              color: SLICE_LOOK.declined,
              text: t('documents.summaryDeclinedCount', { count: declinedQuoteCount }),
            }
          : null,
      ];

  const cardBody = (
    <View
      style={[
        styles.card,
        Platform.OS === 'ios' ? shadows.card : null,
        {
          backgroundColor: look.background,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
        },
      ]}
      accessibilityLabel={`${title}, ${formatPence(amount)}`}
    >
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text variant="caption" color={look.label} style={styles.label}>
            {title}
          </Text>
          <Text variant="display" color={look.amount} style={styles.amount}>
            {formatPence(amount)}
          </Text>
          <View style={styles.stats}>
            {stats.map((stat) =>
              stat ? (
                <View key={stat.text} style={styles.statRow}>
                  <View style={[styles.dot, { backgroundColor: stat.color, borderColor: look.dotBorder }]} />
                  <Text variant="caption" color={look.stat} style={styles.statText}>
                    {stat.text}
                  </Text>
                </View>
              ) : null
            )}
          </View>
        </View>

        <View style={styles.donutSlot}>
          <SummaryDonut slices={chartSlices} scheme={scheme} accessibilityLabel={title} />
        </View>
      </View>
    </View>
  );

  // Android boxShadow on pastel fills is nearly invisible / hard-edged on
  // emulators. Stack many faint plates under the card for a super-soft lift
  // (no elevation plate — that reads as a hard gray slab).
  if (Platform.OS === 'android') {
    return (
      <View style={styles.androidShadowHost}>
        <View pointerEvents="none" style={[styles.androidShadowPlate, styles.androidShadowAmbient]} />
        <View pointerEvents="none" style={[styles.androidShadowPlate, styles.androidShadowFar]} />
        <View pointerEvents="none" style={[styles.androidShadowPlate, styles.androidShadowMid]} />
        <View pointerEvents="none" style={[styles.androidShadowPlate, styles.androidShadowNear]} />
        {cardBody}
      </View>
    );
  }

  return cardBody;
}

/**
 * Skeuomorphic donut via HTML in a WebView.
 * react-native-svg Path/Circle multi-colour fills are broken on this Android build
 * (last colour wins, or stacked Svgs flatten to an empty track).
 * Tray artwork is the Figma recessed porcelain / dark tray SVG.
 */
function SummaryDonut({
  slices,
  scheme,
  accessibilityLabel,
}: {
  slices: Slice[];
  scheme: ThemeScheme;
  accessibilityLabel: string;
}) {
  const html = useMemo(() => buildDonutHtml(slices, scheme), [slices, scheme]);
  // Android WebView often ignores source updates unless remounted.
  const sourceKey = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < html.length; i += 17) hash = (hash * 31 + html.charCodeAt(i)) | 0;
    return `${html.length}:${hash}`;
  }, [html]);

  return (
    <View
      collapsable={false}
      style={styles.donutWrap}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    >
      <WebView
        key={sourceKey}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.donutWeb}
        containerStyle={styles.donutWeb}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        pointerEvents="none"
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
        javaScriptEnabled={false}
      />
    </View>
  );
}

function buildDonutHtml(slices: Slice[], scheme: ThemeScheme): string {
  const dark = scheme === 'dark';
  const traySvg = dark ? DONUT_TRAY_DARK_SVG : DONUT_TRAY_LIGHT_SVG;
  const trayFill = dark ? '#23334B' : '#E6F1FB';
  const sliceStroke = dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.4)';
  const bevelHi = dark ? 'rgba(200,220,255,0.22)' : 'rgba(255,255,255,0.55)';
  const bevelLo = dark ? 'rgba(0,0,0,0.45)' : 'rgba(11,23,51,0.22)';

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const gapDeg = total > 0 && slices.length > 1 ? DONUT_GAP_FRAC * 360 : 0;

  // Paired hard stops (colour at start + colour at end). Android WebView
  // mishandles the newer `color start end` two-position syntax.
  const stops: string[] = [];
  const pushSpan = (color: string, fromDeg: number, toDeg: number) => {
    if (toDeg - fromDeg < 0.2) return;
    stops.push(`${color} ${fromDeg.toFixed(2)}deg`);
    stops.push(`${color} ${toDeg.toFixed(2)}deg`);
  };

  if (total <= 0) {
    pushSpan(trayFill, 0, 360);
  } else {
    let cursor = 0;
    for (const slice of slices) {
      const sweep = (slice.value / total) * 360;
      const start = cursor + gapDeg / 2;
      const end = cursor + sweep - gapDeg / 2;
      pushSpan(trayFill, cursor, start);
      pushSpan(slice.color, start, Math.max(start + 0.5, end));
      cursor += sweep;
    }
    pushSpan(trayFill, cursor, 360);
  }

  const ringMask = `radial-gradient(farthest-side, transparent calc(${DONUT_INNER_PCT}% - 0.5px), #000 ${DONUT_INNER_PCT}%)`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=${DONUT_FRAME}, height=${DONUT_FRAME}, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: ${DONUT_FRAME}px;
    height: ${DONUT_FRAME}px;
    background: transparent;
    overflow: hidden;
  }
  .stage {
    position: relative;
    width: ${DONUT_FRAME}px;
    height: ${DONUT_FRAME}px;
  }
  .tray {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tray svg {
    width: ${DONUT_FRAME}px;
    height: auto;
    max-height: ${DONUT_FRAME}px;
    display: block;
  }
  .slices {
    position: absolute;
    left: 50%;
    top: 50%;
    width: ${DONUT_RING}px;
    height: ${DONUT_RING}px;
    margin-left: ${-DONUT_RING / 2}px;
    margin-top: ${-DONUT_RING / 2}px;
  }
  .ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(from -90deg, ${stops.join(', ')});
    -webkit-mask: ${ringMask};
    mask: ${ringMask};
  }
  .bevel {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    box-shadow:
      inset -1px -2px 3px ${bevelHi},
      inset 1px 3px 5px ${bevelLo};
    -webkit-mask: ${ringMask};
    mask: ${ringMask};
    pointer-events: none;
  }
  .rim {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px ${sliceStroke};
    -webkit-mask: ${ringMask};
    mask: ${ringMask};
    pointer-events: none;
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="tray">${traySvg}</div>
    <div class="slices">
      <div class="ring"></div>
      <div class="bevel"></div>
      <div class="rim"></div>
    </div>
  </div>
</body>
</html>`;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
  },
  androidShadowHost: {
    position: 'relative',
  },
  androidShadowPlate: {
    position: 'absolute',
    // Slightly rounder than the card so hard corners don’t poke through.
    borderRadius: 28,
  },
  // Super-soft stack: cool blue-gray tint (matches #EAF2FA), tiny alphas,
  // heavy downward bias — reads as ambient lift, not a dark slab.
  androidShadowAmbient: {
    left: 22,
    right: 22,
    top: 28,
    bottom: -18,
    backgroundColor: 'rgba(40, 70, 110, 0.035)',
  },
  androidShadowFar: {
    left: 14,
    right: 14,
    top: 18,
    bottom: -12,
    backgroundColor: 'rgba(40, 70, 110, 0.04)',
  },
  androidShadowMid: {
    left: 8,
    right: 8,
    top: 10,
    bottom: -7,
    backgroundColor: 'rgba(40, 70, 110, 0.045)',
  },
  androidShadowNear: {
    left: 4,
    right: 4,
    top: 6,
    bottom: -3,
    backgroundColor: 'rgba(40, 70, 110, 0.05)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  label: {
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  amount: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    fontFamily: 'Lexend_600SemiBold',
  },
  stats: {
    gap: 6,
    marginTop: 6,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    shadowOffset: { width: 0, height: 1 },
  },
  statText: {
    flexShrink: 1,
  },
  donutSlot: {
    width: DONUT_FRAME,
    height: DONUT_FRAME,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutWrap: {
    width: DONUT_FRAME,
    height: DONUT_FRAME,
  },
  donutWeb: {
    width: DONUT_FRAME,
    height: DONUT_FRAME,
    backgroundColor: 'transparent',
  },
});

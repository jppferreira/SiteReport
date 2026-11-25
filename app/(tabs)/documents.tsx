import { router, useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  EmptyState,
  ErrorState,
  FloatingActionButton,
  IconButton,
  Screen,
  SearchInput,
  SegmentedControl,
  Skeleton,
  Text,
} from '@/components';
import {
  DocumentFilterChips,
  DocumentRow,
  DocumentsSummaryCard,
  NewDocumentSheet,
  type DocumentSegment,
} from '@/features/documents';
import { useDocuments } from '@/hooks/useDocuments';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useI18n } from '@/i18n/useI18n';
import type { DocumentKind } from '@/models';
import { isOverdue } from '@/models';
import { useTheme } from '@/theme';

export default function DocumentsScreen() {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { isPro } = useEntitlement();
  const tabBarHeight = useBottomTabBarHeight();
  const [newOpen, setNewOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const {
    items,
    segment,
    setSegment,
    statusFilter,
    setStatusFilter,
    statusCounts,
    search,
    setSearch,
    loading,
    error,
    refresh,
    outstandingInvoicePence,
    unpaidInvoiceCount,
    overdueInvoiceCount,
    overdueInvoicePence,
    paidMonthPence,
    waitingQuoteCount,
    waitingQuotePence,
    sentQuoteCount,
    expiresSoonCount,
    acceptedQuotePence,
  } = useDocuments();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleNewKind = (kind: DocumentKind) => {
    // Reports are built from a full job (photos, notes, signature) — start that flow.
    if (kind === 'report') {
      router.push({ pathname: '/job/new', params: { intent: 'report' } });
      return;
    }
    router.push({ pathname: '/document/new', params: { kind } });
  };

  const segmentSegments = useMemo(
    () => [
      { key: 'quote', label: t('documents.segmentQuotes') },
      { key: 'report', label: t('documents.segmentReports') },
      { key: 'invoice', label: t('documents.segmentInvoices') },
    ],
    [t]
  );

  const emptyCopy =
    search.trim().length > 0
      ? { title: t('documents.emptyNoMatchTitle'), description: t('documents.emptyNoMatchDescription') }
      : { title: t('documents.emptyTitle'), description: t('documents.emptyDescription') };

  const showSummary = segment === 'invoice' || segment === 'quote';

  const grouped = useMemo(() => {
    if (segment !== 'invoice') return null;
    const chasing = items.filter(
      ({ document }) =>
        isOverdue(document) || document.status === 'unpaid' || document.status === 'sent'
    );
    const paid = items.filter(({ document }) => document.status === 'paid');
    const rest = items.filter(
      ({ document }) =>
        !chasing.some((c) => c.document.id === document.id) &&
        !paid.some((p) => p.document.id === document.id)
    );
    return { chasing, paid, rest };
  }, [items, segment]);

  const renderRows = () => {
    if (segment === 'invoice' && grouped) {
      return (
        <>
          {grouped.chasing.length > 0 ? (
            <>
              <Text variant="caption" color={colors.textTertiary} style={styles.section}>
                {t('documents.sectionNeedsChasing')}
              </Text>
              {grouped.chasing.map((item) => (
                <DocumentRow
                  key={item.document.id}
                  item={item}
                  onPress={() => router.push(`/document/${item.document.id}`)}
                />
              ))}
            </>
          ) : null}
          {grouped.paid.length > 0 ? (
            <>
              <Text variant="caption" color={colors.textTertiary} style={styles.section}>
                {t('documents.sectionPaidInMonth', {
                  month: new Date().toLocaleString('en-GB', { month: 'long' }).toUpperCase(),
                })}
              </Text>
              {grouped.paid.map((item) => (
                <DocumentRow
                  key={item.document.id}
                  item={item}
                  onPress={() => router.push(`/document/${item.document.id}`)}
                />
              ))}
            </>
          ) : null}
          {grouped.rest.map((item) => (
            <DocumentRow
              key={item.document.id}
              item={item}
              onPress={() => router.push(`/document/${item.document.id}`)}
            />
          ))}
        </>
      );
    }

    return items.map((item) => (
      <DocumentRow
        key={item.document.id}
        item={item}
        onPress={() => router.push(`/document/${item.document.id}`)}
      />
    ));
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="display">{t('documents.title')}</Text>
          <IconButton
            name="search"
            accessibilityLabel={t('documents.searchPlaceholder')}
            onPress={() => setSearchOpen((v) => !v)}
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <SegmentedControl
            tone="surface"
            segments={segmentSegments}
            value={segment}
            onChange={(key) => {
              setSegment(key as DocumentSegment);
              setStatusFilter('all');
            }}
          />
        </View>
        {searchOpen ? (
          <View style={{ marginTop: spacing.md }}>
            <SearchInput value={search} onChangeText={setSearch} placeholder={t('documents.searchPlaceholder')} />
          </View>
        ) : null}
        {showSummary ? (
          <View style={{ marginTop: spacing.md }}>
            <DocumentsSummaryCard
              segment={segment}
              outstandingPence={outstandingInvoicePence}
              unpaidCount={unpaidInvoiceCount}
              overdueCount={overdueInvoiceCount}
              overduePence={overdueInvoicePence}
              paidMonthPence={paidMonthPence}
              waitingCount={waitingQuoteCount}
              waitingPence={waitingQuotePence}
              sentCount={sentQuoteCount}
              expiresSoonCount={expiresSoonCount}
              acceptedPence={acceptedQuotePence}
            />
          </View>
        ) : null}
        <View style={{ marginTop: spacing.sm }}>
          <DocumentFilterChips
            segment={segment}
            value={statusFilter}
            onChange={setStatusFilter}
            counts={statusCounts}
          />
        </View>
      </View>

      {error ? (
        <View style={{ flex: 1, paddingBottom: tabBarHeight }}>
          <ErrorState title={t('documents.errorLoad')} description={error} onAction={refresh} />
        </View>
      ) : loading ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Skeleton height={96} radius={16} style={{ marginBottom: 12 }} />
          <Skeleton height={96} radius={16} />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, paddingBottom: tabBarHeight }}>
          <EmptyState icon="document-text-outline" title={emptyCopy.title} description={emptyCopy.description} />
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.lg + tabBarHeight + 72,
          }}
        >
          {renderRows()}
        </ScrollView>
      )}

      <FloatingActionButton
        accessibilityLabel={t('documents.new')}
        label={t('documents.new')}
        onPress={() => setNewOpen(true)}
      />

      <NewDocumentSheet
        visible={newOpen}
        isPro={isPro}
        onClose={() => setNewOpen(false)}
        onSelect={handleNewKind}
        onLocked={() => {
          setNewOpen(false);
          router.push({ pathname: '/paywall', params: { trigger: 'quote_invoice' } });
        }}
      />
    </Screen>
  );
}

const styles = {
  section: {
    fontFamily: 'Lexend_600SemiBold' as const,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
};

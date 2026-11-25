import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState, NavigationHeader, Screen, Text } from '@/components';
import { DocumentRow, expiresSoon } from '@/features/documents';
import { useDocuments } from '@/hooks/useDocuments';
import { useI18n } from '@/i18n/useI18n';
import { isOverdue } from '@/models';
import { useTheme } from '@/theme';

export default function NotificationsScreen() {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { allItems, loading, error, refresh } = useDocuments();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const overdue = useMemo(
    () => allItems.filter(({ document }) => document.kind === 'invoice' && isOverdue(document)),
    [allItems]
  );
  const expiring = useMemo(
    () => allItems.filter(({ document }) => document.kind === 'quote' && expiresSoon(document)),
    [allItems]
  );
  const empty = overdue.length === 0 && expiring.length === 0;

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <NavigationHeader title={t('notifications.title')} onBack={() => router.back()} />
      {error ? (
        <ErrorState title={t('documents.errorLoad')} description={error} onAction={refresh} />
      ) : loading && empty ? (
        <LoadingState />
      ) : empty ? (
        <EmptyState title={t('notifications.emptyTitle')} description={t('notifications.emptyDescription')} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, gap: 8 }}>
          {overdue.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text variant="caption" color={colors.textTertiary}>
                {t('notifications.sectionOverdue')}
              </Text>
              {overdue.map((item) => (
                <DocumentRow
                  key={item.document.id}
                  item={item}
                  onPress={() => router.push(`/document/${item.document.id}`)}
                />
              ))}
            </View>
          ) : null}
          {expiring.length > 0 ? (
            <View style={{ gap: 8, marginTop: overdue.length > 0 ? spacing.md : 0 }}>
              <Text variant="caption" color={colors.textTertiary}>
                {t('notifications.sectionExpiring')}
              </Text>
              {expiring.map((item) => (
                <DocumentRow
                  key={item.document.id}
                  item={item}
                  onPress={() => router.push(`/document/${item.document.id}`)}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

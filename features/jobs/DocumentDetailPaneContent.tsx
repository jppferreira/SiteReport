import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { IconButton, LoadingState, Text } from '@/components';
import { documentsRepository } from '@/database';
import { DocStatusBadge } from '@/features/documents/DocStatusBadge';
import { useI18n } from '@/i18n/useI18n';
import type { Document } from '@/models';
import { useTheme } from '@/theme';
import { formatDateShort, formatPence } from '@/utils/format';

type DocumentDetailPaneContentProps = {
  documentId: string;
  onClose: () => void;
};

/**
 * Document detail content for iPad split view detail pane.
 * Shows document header, status, timeline, and quick actions.
 */
export function DocumentDetailPaneContent({ documentId, onClose }: DocumentDetailPaneContentProps) {
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await documentsRepository.getDocument(documentId);
      setDoc(loaded);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState />
      </View>
    );
  }

  if (!doc) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Text variant="bodyLarge" color={colors.textSecondary}>
          {t('documents.notFound')}
        </Text>
      </View>
    );
  }

  const kindLabel =
    doc.kind === 'invoice'
      ? t('documents.kindInvoice')
      : doc.kind === 'quote'
        ? t('documents.kindQuote')
        : t('documents.kindReport');

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text variant="title">{doc.title}</Text>
          </View>
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
            {kindLabel}
            {doc.number ? ` #${doc.number}` : ''}
          </Text>
        </View>
        <IconButton name="close" accessibilityLabel={t('common.close')} onPress={onClose} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surfaceSunken, borderRadius: radius.md, padding: spacing.md },
          ]}
        >
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text variant="caption" color={colors.textSecondary}>
                Status
              </Text>
              <DocStatusBadge status={doc.status} kind={doc.kind} />
            </View>

            {doc.createdAt ? (
              <View>
                <Text variant="caption" color={colors.textSecondary}>
                  Created
                </Text>
                <Text variant="body" style={{ marginTop: 2 }}>
                  {formatDateShort(doc.createdAt)}
                </Text>
              </View>
            ) : null}

            {doc.sentAt ? (
              <View>
                <Text variant="caption" color={colors.textSecondary}>
                  Sent
                </Text>
                <Text variant="body" style={{ marginTop: 2 }}>
                  {formatDateShort(doc.sentAt)}
                </Text>
              </View>
            ) : null}

            {doc.kind === 'invoice' && doc.dueDate ? (
              <View>
                <Text variant="caption" color={colors.textSecondary}>
                  Due
                </Text>
                <Text variant="body" style={{ marginTop: 2 }}>
                  {formatDateShort(doc.dueDate)}
                </Text>
              </View>
            ) : null}

            {doc.totalPence != null ? (
              <View>
                <Text variant="caption" color={colors.textSecondary}>
                  Total
                </Text>
                <Text variant="bodyLarge" style={{ marginTop: 2 }}>
                  {formatPence(doc.totalPence)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Pressable
            onPress={() => router.push(`/document/${doc.id}`)}
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.accent,
                borderRadius: radius.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
              },
            ]}
          >
            <Text variant="button" color={colors.accentOnAccent} style={{ textAlign: 'center' }}>
              {t('common.edit')}
            </Text>
          </Pressable>

          {doc.localPdfUri && (doc.kind === 'quote' || doc.kind === 'invoice') ? (
            <Pressable
              onPress={() => router.push({ pathname: '/document/preview', params: { id: doc.id } })}
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text variant="button" color={colors.textPrimary} style={{ textAlign: 'center' }}>
                {t('common.preview')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  actionButton: {
    alignItems: 'center',
  },
});

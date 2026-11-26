import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  ErrorState,
  IconButton,
  Input,
  LoadingState,
  NavigationHeader,
  Screen,
  Text,
  TextButton,
  useToast,
} from '@/components';
import {
  businessProfileRepository,
  customersRepository,
  documentsRepository,
  jobsRepository,
  workSummaryRepository,
} from '@/database';
import { DocumentPriceEditor } from '@/features/documents/DocumentPriceEditor';
import { PricingReferenceHandle } from '@/features/jobs/PricingReference';
import { useI18n } from '@/i18n/useI18n';
import {
  EMPTY_PRICING,
  VAT_RATE_PERCENT,
  linesForReport,
  pricingVatBreakdown,
  serializePricing,
  type ReportPricing,
  type TradeDocument,
} from '@/models';
import { useTheme } from '@/theme';
import { goBack } from '@/utils/goBack';
import { logger } from '@/utils/logger';

function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

/**
 * Figma S3 / screen 53 — quote (or invoice) editor after the customer step.
 * Customer chip, title, price lines with quick-add chips, Save draft, Preview & send.
 */
export default function DocumentEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const pricingRef = useRef<PricingReferenceHandle>(null);

  const [doc, setDoc] = useState<TradeDocument | null>(null);
  const [customerLabel, setCustomerLabel] = useState<string | null>(null);
  const [customerAddress, setCustomerAddress] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [pricing, setPricing] = useState<ReportPricing>(EMPTY_PRICING);
  const [hasVat, setHasVat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await documentsRepository.getDocument(id);
      setDoc(result);
      if (!result) return;

      const [job, summary, profile] = await Promise.all([
        jobsRepository.getJob(result.jobId),
        workSummaryRepository.getWorkSummary(result.jobId),
        businessProfileRepository.getBusinessProfile(),
      ]);

      setTitle(result.title?.trim() || job?.title || '');
      setPricing(summary?.pricing ?? { enabled: true, lines: [] });
      setHasVat(Boolean(profile.vatNumber?.trim()));

      if (job?.customerId) {
        const c = await customersRepository.getCustomer(job.customerId);
        setCustomerLabel(c?.name ?? job.customerName);
        setCustomerAddress(
          c ? [c.address, c.postcode].filter(Boolean).join(', ') : job.address
        );
      } else {
        setCustomerLabel(job?.customerName ?? null);
        setCustomerAddress(job?.address ?? null);
      }

      if (result.kind === 'quote' || result.kind === 'invoice') {
        if (summary?.documentType !== result.kind) {
          await workSummaryRepository.saveWorkSummary(result.jobId, {
            documentType: result.kind,
            pricing: summary?.pricing ?? { enabled: true, lines: [] },
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const documentType = doc?.kind === 'invoice' ? 'invoice' : 'quote';

  const persistDraft = useCallback(
    async (nextPricing: ReportPricing, nextTitle: string) => {
      if (!doc) return;
      const lines = linesForReport(nextPricing);
      const breakdown = pricingVatBreakdown(lines, hasVat ? VAT_RATE_PERCENT : 0);
      await workSummaryRepository.saveWorkSummary(doc.jobId, {
        pricing: nextPricing,
        documentType,
      });
      await documentsRepository.updateDocumentDraft(doc.id, {
        title: nextTitle.trim() || null,
        pricingSnapshotJson: serializePricing(nextPricing),
        netPence: breakdown?.subtotalPence ?? null,
        vatPence: breakdown?.vatPence ?? null,
        totalPence: breakdown?.totalPence ?? null,
      });
      const trimmed = nextTitle.trim();
      if (trimmed) {
        await jobsRepository.updateJob(doc.jobId, { title: trimmed });
      }
    },
    [doc, documentType, hasVat]
  );

  const savePricing = useCallback(
    async (next: ReportPricing) => {
      setPricing(next);
      await persistDraft(next, title);
      return next;
    },
    [persistDraft, title]
  );

  const handleSaveDraft = async () => {
    if (!doc) return;
    setSaving(true);
    try {
      await pricingRef.current?.flush();
      await persistDraft(pricing, title);
      showToast({ message: t('documents.editor.toastDraftSaved'), tone: 'neutral' });
      router.replace(`/document/${doc.id}`);
    } catch (error) {
      logger.warn('Failed to save document draft', {
        error: error instanceof Error ? error.message : String(error),
      });
      showToast({ message: t('documents.toastUpdateError'), tone: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewSend = async () => {
    if (!doc) return;
    setSaving(true);
    try {
      await pricingRef.current?.flush();
      await persistDraft(pricing, title);
      router.push({ pathname: '/document/preview', params: { id: doc.id } });
    } catch (error) {
      logger.warn('Failed before preview & send', {
        error: error instanceof Error ? error.message : String(error),
      });
      showToast({ message: t('documents.toastUpdateError'), tone: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const titleLabel = useMemo(() => {
    if (doc?.kind === 'invoice') return t('documents.editor.invoiceTitle');
    return t('documents.editor.quoteTitle');
  }, [doc?.kind, t]);

  const barHeight = 52 + Math.max(insets.bottom, spacing.md) + spacing.sm;

  if (loading && !doc) {
    return (
      <Screen>
        <NavigationHeader title={t('documents.editor.title')} onBack={() => goBack('/(tabs)/jobs')} />
        <LoadingState />
      </Screen>
    );
  }

  if (!doc) {
    return (
      <Screen>
        <NavigationHeader title={t('documents.editor.title')} onBack={() => goBack('/(tabs)/jobs')} />
        <ErrorState title={t('documents.notFound')} onAction={load} />
      </Screen>
    );
  }

  const headerTitle = doc.number ?? t('documents.editor.title');

  return (
    <Screen edges={['top', 'left', 'right']}>
      <NavigationHeader
        title={headerTitle}
        left={
          <IconButton
            name="close"
            accessibilityLabel={t('common.close')}
            onPress={() => goBack('/(tabs)/jobs')}
          />
        }
        right={
          <TextButton
            label={t('documents.editor.preview')}
            tone="accent"
            onPress={() => void handlePreviewSend()}
            disabled={saving}
          />
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: barHeight + spacing.md,
            gap: spacing.md,
          }}
        >
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/document/new',
                params: { kind: doc.kind, reassignDocumentId: doc.id },
              })
            }
            style={[
              styles.customerChip,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing.sm,
              },
            ]}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.accentSoft, borderRadius: 20 },
              ]}
            >
              <Text variant="bodyMedium" color={colors.accent}>
                {customerInitials(customerLabel ?? '?')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" numberOfLines={1}>
                {customerLabel ?? t('documents.editor.noCustomer')}
              </Text>
              {customerAddress ? (
                <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                  {customerAddress}
                </Text>
              ) : null}
            </View>
            <Text variant="caption" color={colors.accent} style={{ fontWeight: '600' }}>
              {t('documents.editor.changeCustomer')}
            </Text>
          </Pressable>

          <Input label={titleLabel} value={title} onChangeText={setTitle} autoCapitalize="sentences" />

          <DocumentPriceEditor
            pricing={pricing}
            hasVat={hasVat}
            pricingRef={pricingRef}
            onSavePricing={savePricing}
          />
        </ScrollView>

        <View
          style={[
            styles.bar,
            {
              paddingHorizontal: spacing.lg,
              paddingBottom: Math.max(insets.bottom, spacing.md),
              paddingTop: spacing.sm,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              gap: spacing.sm,
            },
          ]}
        >
          <Button
            variant="secondary"
            label={t('documents.editor.saveDraft')}
            onPress={() => void handleSaveDraft()}
            loading={saving}
            fullWidth={false}
            style={styles.saveBtn}
          />
          <Button
            label={t('documents.editor.previewSend')}
            icon={<Ionicons name="paper-plane-outline" size={20} color={colors.textInverse} />}
            onPress={() => void handlePreviewSend()}
            loading={saving}
            fullWidth={false}
            style={styles.sendBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  customerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    minWidth: 120,
    flexGrow: 0,
    flexShrink: 0,
  },
  sendBtn: {
    flex: 1,
  },
});

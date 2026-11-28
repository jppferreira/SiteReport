import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  CenteredCard,
  NavigationHeader,
  Screen,
  SearchInput,
  SegmentedControl,
  Text,
  TextButton,
  useToast,
} from '@/components';
import { CustomerPicker, type CustomerPickerHandle } from '@/features/documents/CustomerPicker';
import { customersRepository, documentsRepository, jobsRepository } from '@/database';
import { useTabletBreakpoint } from '@/hooks/useTabletBreakpoint';
import { useI18n } from '@/i18n/useI18n';
import { normalizeDocumentKind, type Customer, type Job } from '@/models';
import { useTheme } from '@/theme';
import { getLayoutTokens } from '@/theme/layoutTokens';
import { goBack } from '@/utils/goBack';
import { logger } from '@/utils/logger';

type LinkMode = 'customer' | 'job';

export default function NewStandaloneDocumentScreen() {
  const {
    kind: kindParam,
    jobId: jobIdParam,
    customerId: customerIdParam,
    reassignDocumentId,
  } = useLocalSearchParams<{
    kind?: string;
    jobId?: string;
    customerId?: string;
    reassignDocumentId?: string;
  }>();
  const kind = normalizeDocumentKind(kindParam ?? 'quote');
  const presetJobId = typeof jobIdParam === 'string' ? jobIdParam : undefined;
  const reassignId = typeof reassignDocumentId === 'string' ? reassignDocumentId : undefined;

  const { spacing, colors, radius } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const breakpoint = useTabletBreakpoint();
  const layout = getLayoutTokens(breakpoint);
  const customerPickerRef = useRef<CustomerPickerHandle>(null);

  const [linkMode, setLinkMode] = useState<LinkMode>(presetJobId ? 'job' : 'customer');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(presetJobId ?? null);
  const [draftingCustomer, setDraftingCustomer] = useState(false);
  const [jobSearch, setJobSearch] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const kindLabel = useMemo(() => {
    if (kind === 'invoice') return t('documents.kindInvoice');
    if (kind === 'report') return t('documents.kindReport');
    return t('documents.kindQuote');
  }, [kind, t]);

  const refreshJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const list = await jobsRepository.listJobs('all', jobSearch);
      setJobs(list);
    } finally {
      setJobsLoading(false);
    }
  }, [jobSearch]);

  useEffect(() => {
    if (linkMode === 'job') {
      void refreshJobs();
    }
  }, [linkMode, refreshJobs]);

  useEffect(() => {
    if (typeof customerIdParam !== 'string' || !customerIdParam) return;
    let active = true;
    void customersRepository.getCustomer(customerIdParam).then((customer) => {
      if (!active || !customer) return;
      setSelectedCustomer(customer);
      setLinkMode('customer');
      setValidationError(null);
    });
    return () => {
      active = false;
    };
  }, [customerIdParam]);

  const canSubmit =
    linkMode === 'customer'
      ? selectedCustomer !== null || draftingCustomer
      : selectedJobId !== null || presetJobId != null;

  const resolveCustomer = async (): Promise<{ customer: Customer | null; error: string | null }> => {
    if (linkMode !== 'customer') return { customer: null, error: null };
    if (customerPickerRef.current?.isDrafting()) {
      const saved = await customerPickerRef.current.commitDraft();
      if (!saved) {
        return { customer: null, error: t('documents.newFlow.customerNameRequired') };
      }
      setSelectedCustomer(saved);
      return { customer: saved, error: null };
    }
    if (!selectedCustomer) {
      return { customer: null, error: t('documents.newFlow.selectCustomer') };
    }
    return { customer: selectedCustomer, error: null };
  };

  const handleCreate = async () => {
    setValidationError(null);

    if (linkMode === 'job' && !selectedJobId && !presetJobId) {
      const message = t('documents.newFlow.selectJob');
      setValidationError(message);
      showToast({ message, tone: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      let customer: Customer | null = selectedCustomer;
      if (linkMode === 'customer' && !presetJobId) {
        const resolved = await resolveCustomer();
        if (!resolved.customer) {
          const message = resolved.error ?? t('documents.newFlow.selectCustomer');
          setValidationError(message);
          showToast({ message, tone: 'destructive' });
          return;
        }
        customer = resolved.customer;
      }

      // Reassign customer on an existing draft (Change on the quote editor).
      if (reassignId && customer) {
        const existing = await documentsRepository.getDocument(reassignId);
        if (!existing) {
          showToast({ message: t('documents.notFound'), tone: 'destructive' });
          return;
        }
        await jobsRepository.updateJob(existing.jobId, {
          customerId: customer.id,
          customerName: customer.name,
          address: [customer.address, customer.postcode].filter(Boolean).join(', '),
        });
        router.replace({ pathname: '/document/edit', params: { id: existing.id } });
        return;
      }

      // Reports require a real job completed from scratch (photos → notes → PDF).
      if (kind === 'report') {
        const existingJobId = linkMode === 'job' ? selectedJobId ?? presetJobId ?? null : null;
        if (existingJobId) {
          router.replace(`/job/${existingJobId}`);
          return;
        }
        router.replace({
          pathname: '/job/new',
          params: {
            intent: 'report',
            ...(customer?.name ? { customerName: customer.name } : {}),
            ...(customer?.address ? { address: customer.address } : {}),
            ...(customer?.id ? { customerId: customer.id } : {}),
          },
        });
        return;
      }

      const created = await documentsRepository.createStandaloneDocument({
        kind,
        customerId: linkMode === 'customer' ? customer?.id : undefined,
        jobId: linkMode === 'job' ? selectedJobId ?? presetJobId : undefined,
        title:
          linkMode === 'customer'
            ? customer?.name
            : jobs.find((job) => job.id === (selectedJobId ?? presetJobId))?.title,
      });
      showToast({ message: t('documents.toastCreated'), tone: 'neutral' });
      // Land in the quote/invoice editor (Figma S3).
      router.replace({ pathname: '/document/edit', params: { id: created.id } });
    } catch (error) {
      logger.warn('Failed to create standalone document', {
        error: error instanceof Error ? error.message : String(error),
      });
      showToast({ message: t('documents.toastCreateError'), tone: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const linkSegments = useMemo(
    () => [
      { key: 'customer', label: t('documents.newFlow.linkCustomer') },
      { key: 'job', label: t('documents.newFlow.linkJob') },
    ],
    [t]
  );

  return (
    <Screen>
      <NavigationHeader
        title={t('documents.newFlow.title', { kind: kindLabel })}
        left={<TextButton label={t('documents.newFlow.cancel')} align="left" onPress={() => goBack('/(tabs)/jobs')} />}
        right={
          <TextButton
            label={t('documents.newFlow.create')}
            tone="accent"
            onPress={() => void handleCreate()}
            disabled={submitting}
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
          contentContainerStyle={{ padding: breakpoint.isTablet ? layout.panePadding : spacing.lg, paddingBottom: spacing.xxl }}
        >
          <CenteredCard maxWidth={breakpoint.isTablet ? 600 : undefined}>
            <View style={{ gap: spacing.lg }}>
              <Text variant="body" color={colors.textSecondary}>
                {t('documents.newFlow.subtitle')}
              </Text>

          {presetJobId ? (
            <Text variant="caption" color={colors.textSecondary}>
              {t('documents.newFlow.presetJob')}
            </Text>
          ) : (
            <SegmentedControl
              segments={linkSegments}
              value={linkMode}
              onChange={(key) => {
                setLinkMode(key as LinkMode);
                setValidationError(null);
              }}
            />
          )}

          {linkMode === 'customer' && !presetJobId ? (
            <CustomerPicker
              ref={customerPickerRef}
              selectedId={selectedCustomer?.id ?? null}
              onSelect={(customer) => {
                setSelectedCustomer(customer);
                setValidationError(null);
              }}
              onDraftingChange={setDraftingCustomer}
              onRequestNewCustomer={() =>
                router.push({
                  pathname: '/document/customer-new',
                  params: {
                    kind,
                    ...(reassignId ? { documentId: reassignId } : {}),
                  },
                })
              }
            />
          ) : (
            <View style={{ gap: spacing.md }}>
              <SearchInput
                value={jobSearch}
                onChangeText={setJobSearch}
                placeholder={t('documents.newFlow.jobSearchPlaceholder')}
              />
              {jobsLoading ? (
                <Text variant="caption" color={colors.textSecondary}>
                  {t('documents.newFlow.jobsLoading')}
                </Text>
              ) : jobs.length === 0 ? (
                <Text variant="caption" color={colors.textSecondary}>
                  {t('documents.newFlow.jobsEmpty')}
                </Text>
              ) : (
                <View style={{ gap: spacing.xs }}>
                  {jobs.map((job) => {
                    const active = (selectedJobId ?? presetJobId) === job.id;
                    return (
                      <Pressable
                        key={job.id}
                        onPress={() => {
                          setSelectedJobId(job.id);
                          setValidationError(null);
                        }}
                        style={[
                          styles.jobRow,
                          {
                            borderColor: active ? colors.accent : colors.border,
                            borderRadius: radius.lg,
                            padding: spacing.md,
                            backgroundColor: active ? colors.accentSoft : colors.surface,
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text variant="bodyMedium">{job.title}</Text>
                          {job.customerName ? (
                            <Text variant="caption" color={colors.textSecondary}>
                              {job.customerName}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {validationError ? (
            <Text variant="bodySmall" color={colors.destructive}>
              {validationError}
            </Text>
          ) : !canSubmit && !draftingCustomer ? (
            <Text variant="caption" color={colors.textSecondary}>
              {linkMode === 'customer'
                ? t('documents.newFlow.selectCustomerHint')
                : t('documents.newFlow.selectJobHint')}
            </Text>
          ) : draftingCustomer && !selectedCustomer ? (
            <Text variant="caption" color={colors.textSecondary}>
              {t('documents.newFlow.saveCustomerHint')}
            </Text>
          ) : null}

              <Button
                label={t('documents.newFlow.create')}
                onPress={() => void handleCreate()}
                loading={submitting}
              />
            </View>
          </CenteredCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  jobRow: {
    borderWidth: 1,
  },
});

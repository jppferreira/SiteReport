import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  NavigationHeader,
  Screen,
  SearchInput,
  SegmentedControl,
  Text,
  TextButton,
  useToast,
} from '@/components';
import { CustomerPicker } from '@/features/documents/CustomerPicker';
import { documentsRepository, jobsRepository } from '@/database';
import { useI18n } from '@/i18n/useI18n';
import { normalizeDocumentKind, type Customer, type DocumentKind, type Job } from '@/models';
import { useTheme } from '@/theme';
import { goBack } from '@/utils/goBack';
import { logger } from '@/utils/logger';

type LinkMode = 'customer' | 'job';

export default function NewStandaloneDocumentScreen() {
  const { kind: kindParam, jobId: jobIdParam } = useLocalSearchParams<{ kind?: string; jobId?: string }>();
  const kind = normalizeDocumentKind(kindParam ?? 'quote');
  const presetJobId = typeof jobIdParam === 'string' ? jobIdParam : undefined;

  const { spacing, colors, radius } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();

  const [linkMode, setLinkMode] = useState<LinkMode>(presetJobId ? 'job' : 'customer');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(presetJobId ?? null);
  const [jobSearch, setJobSearch] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const canSubmit =
    linkMode === 'customer' ? selectedCustomer !== null : selectedJobId !== null || presetJobId != null;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Reports require a real job completed from scratch (photos → notes → PDF).
      if (kind === 'report') {
        const existingJobId = linkMode === 'job' ? selectedJobId ?? presetJobId ?? null : null;
        if (existingJobId) {
          router.replace(`/job/${existingJobId}`);
          return;
        }
        const customer = selectedCustomer;
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
        customerId: linkMode === 'customer' ? selectedCustomer?.id : undefined,
        jobId: linkMode === 'job' ? selectedJobId ?? presetJobId : undefined,
        title:
          linkMode === 'customer'
            ? selectedCustomer?.name
            : jobs.find((job) => job.id === (selectedJobId ?? presetJobId))?.title,
      });
      showToast({ message: t('documents.toastCreated'), tone: 'neutral' });
      router.replace(`/document/${created.id}`);
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
        left={<TextButton label={t('documents.newFlow.cancel')} align="left" onPress={() => goBack('/(tabs)/documents')} />}
        right={
          <TextButton
            label={t('documents.newFlow.create')}
            tone="accent"
            onPress={() => void handleCreate()}
            disabled={!canSubmit || submitting}
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
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}
        >
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
              onChange={(key) => setLinkMode(key as LinkMode)}
            />
          )}

          {linkMode === 'customer' && !presetJobId ? (
            <CustomerPicker
              selectedId={selectedCustomer?.id ?? null}
              onSelect={setSelectedCustomer}
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
                        onPress={() => setSelectedJobId(job.id)}
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

          <Button label={t('documents.newFlow.create')} onPress={() => void handleCreate()} loading={submitting} disabled={!canSubmit} />
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
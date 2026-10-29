import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView } from 'react-native';

import { ErrorState, FIELD_STACK_GAP, Input, LoadingState, NavigationHeader, Screen, Text, TextArea, TextButton } from '@/components';
import { jobsRepository } from '@/database';
import { DateField } from '@/features/jobs/DateField';
import { useFlushWhenHidden } from '@/hooks/useFlushWhenHidden';
import { useJob } from '@/hooks/useJob';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { goBack } from '@/utils/goBack';
import { validateJobTitle } from '@/utils/validation';

export default function EditJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { job, loading, error } = useJob(id);

  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [jobDate, setJobDate] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [savedLabel, setSavedLabel] = useState<'idle' | 'saving' | 'saved'>('idle');
  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);
  const draftRef = useRef({ title, customerName, address, jobDate, referenceNumber, description });

  useEffect(() => {
    draftRef.current = { title, customerName, address, jobDate, referenceNumber, description };
  }, [title, customerName, address, jobDate, referenceNumber, description]);

  const persistPending = useCallback(() => {
    if (!pendingRef.current || !hydrated.current) return;
    const draft = draftRef.current;
    if (!validateJobTitle(draft.title).valid) return;
    pendingRef.current = false;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    void jobsRepository.updateJob(id, draft).catch(() => undefined);
  }, [id]);

  useFlushWhenHidden(persistPending);

  useEffect(() => {
    if (job && !hydrated.current) {
      setTitle(job.title);
      setCustomerName(job.customerName ?? '');
      setAddress(job.address ?? '');
      setJobDate(job.jobDate);
      setReferenceNumber(job.referenceNumber ?? '');
      setDescription(job.description ?? '');
      hydrated.current = true;
    }
  }, [job]);

  useEffect(() => {
    if (!hydrated.current) return;
    const validation = validateJobTitle(title);
    if (!validation.valid) return;

    // Immediately reflects "saving" while the debounced persistence below
    // runs; this mirrors the autosave operation itself, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedLabel('saving');
    pendingRef.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      pendingRef.current = false;
      timer.current = null;
      await jobsRepository.updateJob(id, { title, customerName, address, jobDate, referenceNumber, description });
      setSavedLabel('saved');
    }, 500);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [id, title, customerName, address, jobDate, referenceNumber, description]);

  if (loading && !job) {
    return (
      <Screen>
        <NavigationHeader title={t('edit.title')} onBack={() => goBack(`/job/${id}`)} />
        <LoadingState />
      </Screen>
    );
  }

  if (error || !job) {
    return (
      <Screen>
        <NavigationHeader title={t('edit.title')} onBack={() => goBack(`/job/${id}`)} />
        <ErrorState title={t('edit.notFound')} description={error ?? undefined} />
      </Screen>
    );
  }

  return (
    <Screen>
      <NavigationHeader
        title={t('edit.title')}
        onBack={() => goBack(`/job/${id}`)}
        right={<TextButton label={t('edit.done')} onPress={() => goBack(`/job/${id}`)} />}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: FIELD_STACK_GAP }}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label={t('edit.jobTitle')}
            required
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              const validation = validateJobTitle(value);
              setTitleError(validation.valid ? null : validation.message);
            }}
            error={titleError ?? undefined}
          />
          <Input label={t('edit.customerName')} value={customerName} onChangeText={setCustomerName} />
          <Input label={t('edit.address')} value={address} onChangeText={setAddress} />
          <DateField label={t('edit.date')} value={jobDate} onChange={setJobDate} />
          <Input label={t('edit.referenceNumber')} value={referenceNumber} onChangeText={setReferenceNumber} />
          <TextArea label={t('edit.jobDescription')} value={description} onChangeText={setDescription} minHeight={100} />

          <Text variant="caption" color={colors.textSecondary}>
            {savedLabel === 'saving' ? t('edit.saving') : savedLabel === 'saved' ? t('edit.allChangesSaved') : ' '}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

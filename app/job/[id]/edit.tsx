import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { ErrorState, Input, LoadingState, NavigationHeader, Screen, Text, TextArea, TextButton } from '@/components';
import { jobsRepository } from '@/database';
import { DateField } from '@/features/jobs/DateField';
import { useJob } from '@/hooks/useJob';
import { useTheme } from '@/theme';
import { validateJobTitle } from '@/utils/validation';

export default function EditJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
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
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
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
        <NavigationHeader title="Job details" onBack={() => router.back()} />
        <LoadingState />
      </Screen>
    );
  }

  if (error || !job) {
    return (
      <Screen>
        <NavigationHeader title="Job details" onBack={() => router.back()} />
        <ErrorState title="This job could not be found" description={error ?? undefined} />
      </Screen>
    );
  }

  return (
    <Screen>
      <NavigationHeader
        title="Job details"
        right={<TextButton label="Done" onPress={() => router.back()} />}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label="Job title"
            required
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              const validation = validateJobTitle(value);
              setTitleError(validation.valid ? null : validation.message);
            }}
            error={titleError ?? undefined}
          />
          <Input label="Customer name" value={customerName} onChangeText={setCustomerName} />
          <Input label="Address" value={address} onChangeText={setAddress} />
          <DateField label="Date" value={jobDate} onChange={setJobDate} />
          <Input label="Reference number" value={referenceNumber} onChangeText={setReferenceNumber} />
          <TextArea label="Job description" value={description} onChangeText={setDescription} minHeight={100} />

          <Text variant="caption" color={colors.textSecondary}>
            {savedLabel === 'saving' ? 'Saving…' : savedLabel === 'saved' ? 'All changes saved' : ' '}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

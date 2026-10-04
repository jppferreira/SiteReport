import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button, Input, NavigationHeader, Screen, TextArea, TextButton } from '@/components';
import { DateField } from '@/features/jobs/DateField';
import { jobsRepository } from '@/database';
import { useTheme } from '@/theme';
import { todayIsoDate } from '@/utils/format';
import { validateJobTitle } from '@/utils/validation';

export default function NewJobScreen() {
  const { spacing } = useTheme();
  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [jobDate, setJobDate] = useState(todayIsoDate());
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    const validation = validateJobTitle(title);
    if (!validation.valid) {
      setTitleError(validation.message);
      return;
    }
    setSubmitting(true);
    try {
      const job = await jobsRepository.createJob({
        title,
        customerName,
        address,
        jobDate,
        referenceNumber,
        description,
      });
      router.replace(`/job/${job.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <NavigationHeader
        title="New job"
        right={<TextButton label="Cancel" onPress={() => router.back()} />}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={16}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label="Job title"
            required
            placeholder="e.g. Bathroom repair"
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              if (titleError) setTitleError(null);
            }}
            error={titleError ?? undefined}
            returnKeyType="next"
            autoFocus
          />
          <Input
            label="Customer name"
            placeholder="e.g. James Wilson"
            value={customerName}
            onChangeText={setCustomerName}
          />
          <Input label="Address" placeholder="Job site address" value={address} onChangeText={setAddress} />
          <DateField label="Date" value={jobDate} onChange={setJobDate} />
          <Input
            label="Reference number"
            placeholder="Optional"
            value={referenceNumber}
            onChangeText={setReferenceNumber}
          />
          <TextArea
            label="Job description"
            placeholder="What's the job about?"
            value={description}
            onChangeText={setDescription}
            minHeight={100}
          />

          <View style={{ marginTop: spacing.sm }}>
            <Button label="Create job" onPress={handleCreate} loading={submitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

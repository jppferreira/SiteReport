import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button, FIELD_STACK_GAP, Input, NavigationHeader, Screen, TextArea, TextButton } from '@/components';
import { DateField } from '@/features/jobs/DateField';
import { jobsRepository } from '@/database';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { todayIsoDate } from '@/utils/format';
import { validateJobTitle } from '@/utils/validation';

export default function NewJobScreen() {
  const { spacing } = useTheme();
  const { t } = useI18n();
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
      router.dismiss();
      router.push(`/job/${job.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <NavigationHeader
        title={t('newJob.title')}
        left={<TextButton label={t('newJob.cancel')} align="left" onPress={() => router.back()} />}
        right={<TextButton label={t('newJob.save')} tone="accent" onPress={handleCreate} />}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: FIELD_STACK_GAP }}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label={t('newJob.jobTitle')}
            required
            placeholder={t('newJob.jobTitlePlaceholder')}
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
            label={t('newJob.clientName')}
            placeholder={t('newJob.clientNamePlaceholder')}
            value={customerName}
            onChangeText={setCustomerName}
          />
          <Input
            label={t('newJob.address')}
            placeholder={t('newJob.addressPlaceholder')}
            value={address}
            onChangeText={setAddress}
          />
          <DateField label={t('newJob.date')} value={jobDate} onChange={setJobDate} />
          <TextArea
            label={t('newJob.notes')}
            placeholder={t('newJob.notesPlaceholder')}
            value={description}
            onChangeText={setDescription}
            minHeight={100}
          />
          <Input
            label={t('newJob.reference')}
            placeholder={t('newJob.referencePlaceholder')}
            value={referenceNumber}
            onChangeText={setReferenceNumber}
          />

          <View style={{ marginTop: spacing.sm }}>
            <Button label={t('newJob.continue')} onPress={handleCreate} loading={submitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

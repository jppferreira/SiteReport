import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button, FIELD_STACK_GAP, Input, NavigationHeader, Screen, Text, TextArea, TextButton } from '@/components';
import { DateField } from '@/features/jobs/DateField';
import { jobsRepository } from '@/database';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { todayIsoDate } from '@/utils/format';
import { goBack } from '@/utils/goBack';
import { validateJobTitle } from '@/utils/validation';

export default function NewJobScreen() {
  const { spacing, colors } = useTheme();
  const { t } = useI18n();
  const params = useLocalSearchParams<{
    intent?: string;
    customerName?: string;
    address?: string;
    customerId?: string;
    title?: string;
  }>();
  const forReport = params.intent === 'report';

  const [title, setTitle] = useState(typeof params.title === 'string' ? params.title : '');
  const [customerName, setCustomerName] = useState(
    typeof params.customerName === 'string' ? params.customerName : ''
  );
  const [address, setAddress] = useState(typeof params.address === 'string' ? params.address : '');
  const [jobDate, setJobDate] = useState(todayIsoDate());
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const headerTitle = useMemo(
    () => (forReport ? t('newJob.reportTitle') : t('newJob.title')),
    [forReport, t]
  );

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
        customerId: typeof params.customerId === 'string' ? params.customerId : null,
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
        title={headerTitle}
        left={
          <TextButton
            label={t('newJob.cancel')}
            align="left"
            onPress={() => goBack('/(tabs)/jobs')}
          />
        }
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
          {forReport ? (
            <Text variant="body" color={colors.textSecondary}>
              {t('newJob.reportIntro')}
            </Text>
          ) : null}
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
            returnKeyType="next"
          />
          <TextArea
            label={t('newJob.address')}
            placeholder={t('newJob.addressPlaceholder')}
            value={address}
            onChangeText={setAddress}
          />
          <DateField label={t('newJob.jobDate')} value={jobDate} onChange={setJobDate} />
          <Input
            label={t('newJob.reference')}
            placeholder={t('newJob.referencePlaceholder')}
            value={referenceNumber}
            onChangeText={setReferenceNumber}
            returnKeyType="next"
          />
          <TextArea
            label={t('newJob.description')}
            placeholder={t('newJob.descriptionPlaceholder')}
            value={description}
            onChangeText={setDescription}
          />
          <View style={{ marginTop: spacing.sm }}>
            <Button
              label={forReport ? t('newJob.startReportJob') : t('newJob.save')}
              onPress={handleCreate}
              loading={submitting}
              disabled={submitting}
              variant="accent"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

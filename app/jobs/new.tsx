import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/core/Button';
import { Input, TextArea } from '@/components/core/Input';
import { AppText } from '@/components/core/AppText';
import { validateJobTitle } from '@/features/jobs/jobValidation';
import { jobService } from '@/services/jobService';
import { colors, spacing } from '@/theme';

export default function CreateJobScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const create = async () => {
    const validationError = validateJobTitle(title);
    if (validationError) {
      setTitleError(validationError);
      return;
    }

    setSaving(true);
    const job = await jobService.createJob({
      title,
      customerName,
      address,
      referenceNumber,
      description,
      jobDate: new Date().toISOString(),
    });
    setSaving(false);

    if (job) {
      router.replace(`/jobs/${job.id}`);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="h2">Create a new job</AppText>
        <Input
          label="Job title *"
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            if (value.trim()) setTitleError(null);
          }}
          placeholder="e.g. Bathroom repair"
          error={titleError}
        />
        <Input label="Customer name" value={customerName} onChangeText={setCustomerName} placeholder="Optional" />
        <Input label="Address" value={address} onChangeText={setAddress} placeholder="Optional" />
        <Input label="Reference number" value={referenceNumber} onChangeText={setReferenceNumber} placeholder="Optional" />
        <TextArea
          label="Job description"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the issue or job request…"
        />

        <View style={styles.actions}>
          <Button label="Create job" onPress={() => void create()} loading={saving} />
          <Button label="Cancel" variant="tertiary" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.screenHorizontal,
    gap: spacing.md,
    paddingBottom: spacing.x5,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});

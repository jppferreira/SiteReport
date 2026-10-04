import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/core/AppText';
import { Button } from '@/components/core/Button';
import { Card } from '@/components/core/Card';
import { Input, TextArea } from '@/components/core/Input';
import { SectionHeader } from '@/components/core/SectionHeader';
import { StatusBadge } from '@/components/core/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import type { Job } from '@/models/domain';
import { databaseService } from '@/services/databaseService';
import { jobService, type JobSectionProgress } from '@/services/jobService';
import { colors, spacing } from '@/theme';
import { formatJobDate } from '@/utils/date';

const sectionLabels = [
  { key: 'details', label: 'Job details', description: 'Core job information' },
  { key: 'photos', label: 'Photos', description: 'Before and after captures' },
  { key: 'summary', label: 'Work summary', description: 'Completed work notes' },
  { key: 'signature', label: 'Signature', description: 'Optional customer sign-off' },
  { key: 'report', label: 'Report', description: 'PDF generation state' },
] as const;

export default function JobOverviewScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [progress, setProgress] = useState<JobSectionProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const [nextJob, nextProgress] = await Promise.all([databaseService.getJob(jobId), jobService.getProgress(jobId)]);
      if (!nextJob) {
        setError('Job not found');
        setLoading(false);
        return;
      }

      setJob(nextJob);
      setProgress(nextProgress);
      setTitle(nextJob.title);
      setCustomerName(nextJob.customerName ?? '');
      setAddress(nextJob.address ?? '');
      setReferenceNumber(nextJob.referenceNumber ?? '');
      setDescription(nextJob.description ?? '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load this job');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const nextJobStatus = progress && progress.completedSections === progress.totalSections ? 'complete' : 'draft';

  useEffect(() => {
    if (!job) {
      return;
    }

    const handle = setTimeout(() => {
      void (async () => {
        await jobService.updateJob(job.id, {
          title: title.trim() || job.title,
          customerName: customerName.trim() || null,
          address: address.trim() || null,
          referenceNumber: referenceNumber.trim() || null,
          description: description.trim() || null,
          status: nextJobStatus,
        });
      })();
    }, 350);

    return () => clearTimeout(handle);
  }, [job, title, customerName, address, referenceNumber, description, nextJobStatus]);

  const deleteJob = async () => {
    if (!job) return;
    Alert.alert('Delete this job?', 'This will permanently remove its information, photos and generated reports from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete job',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await jobService.deleteJob(job.id);
            router.replace('/(tabs)/jobs');
          })();
        },
      },
    ]);
  };

  const cta = useMemo(() => {
    if (!progress) {
      return { label: 'Continue', action: () => router.push(`/jobs/${jobId}/photos`) };
    }
    if (progress.photos !== 'complete') {
      return { label: 'Add photos', action: () => router.push(`/jobs/${jobId}/photos`) };
    }
    if (progress.summary !== 'complete') {
      return { label: 'Continue report', action: () => router.push(`/jobs/${jobId}/summary`) };
    }
    return { label: 'Preview report', action: () => router.push(`/jobs/${jobId}/preview`) };
  }, [progress, jobId, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState label="Loading job…" />
      </SafeAreaView>
    );
  }

  if (error || !job || !progress) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState title="Couldn't load job" description={error ?? 'This job is unavailable.'} actionLabel="Back" onAction={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader
          title={job.title}
          subtitle={`${job.customerName || 'No customer'} · ${formatJobDate(job.jobDate)}`}
          action={<StatusBadge status={job.status} />}
        />

        <Card style={styles.progressCard}>
          <AppText variant="caption" color={colors.textSecondary}>
            REPORT PROGRESS
          </AppText>
          <AppText variant="h3">
            {progress.completedSections} of {progress.totalSections} sections complete
          </AppText>
        </Card>

        <Card style={styles.card}>
          <AppText variant="h3">Job details</AppText>
          <Input label="Job title *" value={title} onChangeText={setTitle} />
          <Input label="Customer name" value={customerName} onChangeText={setCustomerName} />
          <Input label="Address" value={address} onChangeText={setAddress} />
          <Input label="Reference number" value={referenceNumber} onChangeText={setReferenceNumber} />
          <TextArea
            label="Job description"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the work requested…"
          />
        </Card>

        <Card style={styles.card}>
          <AppText variant="h3">Sections</AppText>
          {sectionLabels.map((section) => (
            <View key={section.key} style={styles.sectionRow}>
              <View style={styles.sectionText}>
                <AppText variant="body">{section.label}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {section.description}
                </AppText>
              </View>
              <StatusBadge status={progress[section.key]} />
            </View>
          ))}
          <Button label="Photos" variant="secondary" onPress={() => router.push(`/jobs/${job.id}/photos`)} />
          <Button label="Work summary" variant="secondary" onPress={() => router.push(`/jobs/${job.id}/summary`)} />
          <Button label="Signature" variant="secondary" onPress={() => router.push(`/jobs/${job.id}/signature`)} />
        </Card>

        <Button label={cta.label} onPress={cta.action} />
        <Button label="Delete job" variant="destructive" onPress={deleteJob} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.x5,
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  progressCard: {
    gap: spacing.xs,
  },
  card: {
    gap: spacing.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionText: {
    flex: 1,
  },
});

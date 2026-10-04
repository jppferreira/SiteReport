import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Divider, LoadingState, NavigationHeader, Screen, StatusBadge, Text } from '@/components';
import { businessProfileRepository, photosRepository, signatureRepository, workSummaryRepository } from '@/database';
import { useJob } from '@/hooks/useJob';
import { BusinessProfile, Photo, Signature, WorkSummary } from '@/models';
import { canGenerateReportForJob } from '@/services/entitlementService';
import { getReportFreshness } from '@/services/pdfService';
import { useTheme } from '@/theme';
import { formatDate, formatDateTime } from '@/utils/format';

export default function ReportPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const { job, loading: jobLoading } = useJob(id);
  const [before, setBefore] = useState<Photo[]>([]);
  const [after, setAfter] = useState<Photo[]>([]);
  const [summary, setSummary] = useState<WorkSummary | null>(null);
  const [signature, setSignature] = useState<Signature | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [reportState, setReportState] = useState<'none' | 'stale' | 'fresh'>('none');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, a, s, sig, biz, freshness] = await Promise.all([
      photosRepository.listPhotos(id, 'before'),
      photosRepository.listPhotos(id, 'after'),
      workSummaryRepository.getWorkSummary(id),
      signatureRepository.getSignature(id),
      businessProfileRepository.getBusinessProfile(),
      getReportFreshness(id),
    ]);
    setBefore(b);
    setAfter(a);
    setSummary(s);
    setSignature(sig);
    setBusiness(biz);
    setReportState(freshness);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleGenerate = async () => {
    const allowed = await canGenerateReportForJob(id);
    if (!allowed) {
      router.push({ pathname: '/paywall', params: { trigger: 'free_limit' } });
      return;
    }
    router.push(`/job/${id}/generate`);
  };

  if (jobLoading || loading || !job) {
    return (
      <Screen>
        <NavigationHeader title="Report preview" onBack={() => router.back()} />
        <LoadingState />
      </Screen>
    );
  }

  const ctaLabel = reportState === 'fresh' ? 'Regenerate report' : reportState === 'stale' ? 'Update report' : 'Generate PDF';

  return (
    <Screen>
      <NavigationHeader title="Report preview" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <View
          style={[
            styles.document,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
          ]}
        >
          <View style={styles.brandRow}>
            {business?.logoUri ? (
              <Image source={{ uri: business.logoUri }} style={styles.logo} />
            ) : (
              <View style={[styles.logoPlaceholder, { backgroundColor: colors.ctaDark }]}>
                <Text variant="bodyMedium" color={colors.textInverse}>
                  {(business?.businessName || 'S').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <Text variant="bodyMedium" style={{ flex: 1, marginLeft: spacing.sm }} numberOfLines={1}>
              {business?.businessName || 'Your business'}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              JOB REPORT
            </Text>
          </View>

          <Text variant="h1" style={{ marginTop: spacing.lg }}>
            {job.title}
          </Text>
          <View style={styles.metaRow}>
            {job.referenceNumber ? (
              <Text variant="bodySmall" color={colors.textSecondary}>
                Ref {job.referenceNumber}
              </Text>
            ) : null}
            <Text variant="bodySmall" color={colors.textSecondary}>
              {formatDate(job.jobDate)}
            </Text>
          </View>

          {job.customerName || job.address ? (
            <Section title="Customer">
              {job.customerName ? <Text variant="bodyMedium">{job.customerName}</Text> : null}
              {job.address ? (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {job.address}
                </Text>
              ) : null}
            </Section>
          ) : null}

          {job.description ? (
            <Section title="Job summary">
              <Text variant="body">{job.description}</Text>
            </Section>
          ) : null}

          {before.length > 0 ? (
            <Section title="Before">
              <PhotoRow photos={before} />
            </Section>
          ) : null}

          {summary?.workCompleted ? (
            <Section title="Work completed">
              <Text variant="body">{summary.workCompleted}</Text>
            </Section>
          ) : null}

          {after.length > 0 ? (
            <Section title="After">
              <PhotoRow photos={after} />
            </Section>
          ) : null}

          {summary?.materials ? (
            <Section title="Materials used">
              <Text variant="body">{summary.materials}</Text>
            </Section>
          ) : null}

          {summary?.recommendations ? (
            <Section title="Recommendations">
              <Text variant="body">{summary.recommendations}</Text>
            </Section>
          ) : null}

          {signature ? (
            <Section title="Customer sign-off">
              <Text variant="bodyMedium">{signature.customerName || 'Customer'}</Text>
              <Text variant="caption" color={colors.textSecondary}>
                Signed {formatDateTime(signature.signedAt)}
              </Text>
            </Section>
          ) : null}

          <Divider />
          <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
            {business?.footerMessage || 'Generated with SiteReport'}
          </Text>
        </View>
      </ScrollView>

      <View style={{ padding: spacing.lg, paddingTop: spacing.sm }}>
        {reportState !== 'none' ? (
          <View style={{ marginBottom: spacing.sm, alignItems: 'center' }}>
            <StatusBadge
              label={reportState === 'fresh' ? 'REPORT UP TO DATE' : 'JOB CHANGED SINCE LAST REPORT'}
              tone={reportState === 'fresh' ? 'success' : 'warning'}
            />
          </View>
        ) : null}
        <Button label={ctaLabel} onPress={handleGenerate} />
      </View>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text
        variant="caption"
        color={colors.accentPressed}
        style={{ textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function PhotoRow({ photos }: { photos: Photo[] }) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs }}>
      {photos.slice(0, 6).map((photo) => (
        <Image key={photo.id} source={{ uri: photo.thumbnailUri }} style={styles.previewPhoto} contentFit="cover" />
      ))}
      {photos.length > 6 ? (
        <View style={styles.morePhotos}>
          <Text variant="caption">+{photos.length - 6}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  document: {
    borderWidth: 1,
    marginTop: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  logoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  previewPhoto: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  morePhotos: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#F1F3F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

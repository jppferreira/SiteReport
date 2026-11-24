import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LoadingState, NavigationHeader, Screen, StatusBadge, Text } from '@/components';
import {
  businessProfileRepository,
  jobsRepository,
  photosRepository,
  reportEventsRepository,
  reportsRepository,
} from '@/database';
import { SendBrandedEmailSheet } from '@/features/reports/SendBrandedEmailSheet';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useI18n } from '@/i18n/useI18n';
import { BusinessProfile, Job, Report, ReportEvent } from '@/models';
import { useTheme } from '@/theme';
import { formatDate, formatFileSize } from '@/utils/format';
import { goBack } from '@/utils/goBack';

function formatEventTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatSentPill(iso: string, t: (key: string, opts?: Record<string, string>) => string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return t('sendEmail.sent');
  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const time = formatEventTime(iso);
  if (sameDay) return t('sendEmail.sentToday', { time });
  return t('sendEmail.sentOn', { date: formatDate(iso.slice(0, 10)), time });
}

export default function SendReportScreen() {
  const { id, reportId } = useLocalSearchParams<{ id: string; reportId?: string }>();
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { isPro, loading: entitlementLoading } = useEntitlement();
  const [job, setJob] = useState<Job | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [events, setEvents] = useState<ReportEvent[]>([]);
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(true);

  useEffect(() => {
    if (entitlementLoading) return;
    if (!isPro) {
      router.replace({ pathname: '/paywall', params: { trigger: 'branded_email' } });
      return;
    }
    let cancelled = false;
    (async () => {
      const [loadedJob, profile, reports] = await Promise.all([
        jobsRepository.getJob(id),
        businessProfileRepository.getBusinessProfile(),
        reportsRepository.listReportsForJob(id),
      ]);
      if (cancelled) return;
      setJob(loadedJob);
      setBusiness(profile);
      const chosen =
        (reportId ? reports.find((item) => item.id === reportId) : null) ??
        reports.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ??
        null;
      setReport(chosen);
      if (chosen) {
        const log = await reportEventsRepository.listEventsForReport(chosen.id);
        if (!cancelled) setEvents(log);
      } else {
        const log = await reportEventsRepository.listEventsForJob(id);
        if (!cancelled) setEvents(log);
      }
      if (loadedJob?.coverPhotoId) {
        const cover = await photosRepository.getPhoto(loadedJob.coverPhotoId);
        if (!cancelled) setThumbUri(cover?.thumbnailUri ?? cover?.localUri ?? null);
      } else {
        const photos = await photosRepository.listPhotos(id);
        if (!cancelled) setThumbUri(photos[0]?.thumbnailUri ?? photos[0]?.localUri ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reportId, isPro, entitlementLoading]);

  const latestEmail = useMemo(
    () => events.find((event) => event.kind === 'emailed') ?? null,
    [events]
  );

  if (!job) {
    return (
      <Screen>
        <NavigationHeader title={t('sendEmail.screenTitle')} onBack={() => goBack(`/job/${id}`)} />
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <NavigationHeader title={t('sendEmail.screenTitle')} onBack={() => goBack(`/job/${id}`)} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 4 }}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.jobRow}>
            {thumbUri ? (
              <Image source={{ uri: thumbUri }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, { backgroundColor: colors.surfaceSunken }]} />
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyMedium" numberOfLines={2}>
                {job.title}
                {job.address ? ` — ${job.address}` : ''}
              </Text>
              <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                {[job.customerName, job.address].filter(Boolean).join(' · ') || t('sendEmail.noCustomer')}
              </Text>
            </View>
          </View>

          {latestEmail ? (
            <StatusBadge label={formatSentPill(latestEmail.createdAt, t)} tone="success" />
          ) : report ? (
            <StatusBadge label={t('sendEmail.readyToSend')} tone="neutral" />
          ) : (
            <StatusBadge label={t('sendEmail.noReport')} tone="warning" />
          )}

          {latestEmail?.recipient ? (
            <View style={styles.recipient}>
              <Ionicons name="mail-outline" size={15} color={colors.textSecondary} />
              <Text variant="bodySmall" style={{ flex: 1 }}>
                {latestEmail.recipient}
              </Text>
            </View>
          ) : null}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text variant="caption" color={colors.textTertiary} style={styles.logTitle}>
            {t('sendEmail.sentLog')}
          </Text>
          {events.length === 0 ? (
            <Text variant="caption" color={colors.textSecondary}>
              {t('sendEmail.sentLogEmpty')}
            </Text>
          ) : (
            events.map((event) => (
              <View key={event.id} style={styles.logRow}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: event.kind === 'emailed' ? colors.accent : colors.borderStrong },
                  ]}
                />
                <Text
                  variant="caption"
                  color={event.kind === 'emailed' ? colors.textPrimary : colors.textSecondary}
                  style={{ flex: 1, fontWeight: event.kind === 'emailed' ? '500' : '400', fontSize: 12.5 }}
                >
                  {event.label}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {formatEventTime(event.createdAt)}
                </Text>
              </View>
            ))
          )}

          {report ? (
            <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 8 }}>
              {report.fileName} · {formatFileSize(report.fileSize)}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      {report ? (
        <SendBrandedEmailSheet
          visible={sheetOpen}
          onClose={() => {
            setSheetOpen(false);
            router.back();
          }}
          job={job}
          report={report}
          business={business}
          onSent={async (name, email) => {
            const event = await reportEventsRepository.addEvent({
              reportId: report.id,
              jobId: job.id,
              kind: 'emailed',
              label: t('sendEmail.logEmailed', { name: name || email }),
              recipient: email,
            });
            setEvents((current) => [event, ...current]);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  recipient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  logTitle: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.95,
    textTransform: 'uppercase',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import React, { useMemo } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BottomSheet, Button, IconButton, Text, TextArea } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { MAX_RECORDING_MS, type VoiceReportSession } from '@/services/voiceReport';
import { useTheme } from '@/theme';

import { formatElapsed } from './formatElapsed';
import { LevelMeter } from './LevelMeter';

type VoiceReportSheetProps = {
  visible: boolean;
  session: VoiceReportSession | null;
  onClose: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onMakeProfessional: () => void;
  onChangeTranscript: (value: string) => void;
  onRecordAgain: () => void;
  onUseTranscript: () => void;
  onUseProfessional: () => void;
};

export function VoiceReportSheet({
  visible,
  session,
  onClose,
  onStart,
  onPause,
  onResume,
  onStop,
  onMakeProfessional,
  onChangeTranscript,
  onRecordAgain,
  onUseTranscript,
  onUseProfessional,
}: VoiceReportSheetProps) {
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();
  const phase = session?.phase ?? 'idle';

  const title = useMemo(() => {
    switch (phase) {
      case 'transcribing':
        return t('voiceReport.transcribingTitle');
      case 'formatting':
        return t('voiceReport.formattingTitle');
      case 'readyToReview':
        return t('voiceReport.reviewTitle');
      case 'error':
        return t('voiceReport.errorTitle');
      default:
        return t('voiceReport.recordTitle');
    }
  }, [phase, t]);

  const aiAvailable = session?.aiAvailability.status === 'available';
  const professionalLabel =
    session?.professional?.source === 'on_device_ai'
      ? t('voiceReport.professionalAiLabel')
      : t('voiceReport.professionalFormattedLabel');

  return (
    <BottomSheet visible={visible} onClose={onClose} dragHandleOnly maxHeight={640}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md }}>
        <View style={styles.headerRow}>
          <Text variant="h3">{title}</Text>
          <IconButton name="close" accessibilityLabel={t('common.close')} onPress={onClose} variant="ghost" />
        </View>

        <Text variant="caption" color={colors.textSecondary}>
          {t('voiceReport.privacyNote')}
        </Text>

        {(phase === 'ready' ||
          phase === 'requestingPermission' ||
          phase === 'recording' ||
          phase === 'paused' ||
          phase === 'idle') && (
          <RecordingBody
            session={session}
            onStart={onStart}
            onPause={onPause}
            onResume={onResume}
            onStop={onStop}
            onCancel={onClose}
          />
        )}

        {phase === 'transcribing' || phase === 'formatting' ? (
          <View style={[styles.processing, { backgroundColor: colors.accentSoft, borderRadius: radius.lg }]}>
            <ActivityIndicator color={colors.accent} />
            <Text variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
              {phase === 'transcribing' ? t('voiceReport.transcribingBody') : t('voiceReport.formattingBody')}
            </Text>
            <Button label={t('common.cancel')} variant="tertiary" onPress={onClose} style={{ marginTop: spacing.md }} />
          </View>
        ) : null}

        {phase === 'readyToReview' && session ? (
          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            <Text variant="label" color={colors.textSecondary}>
              {t('voiceReport.transcriptLabel')}
            </Text>
            <TextArea
              value={session.transcript}
              onChangeText={onChangeTranscript}
              minHeight={110}
              accessibilityLabel={t('voiceReport.transcriptLabel')}
            />

            <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
              <View style={styles.headerRow}>
                <Text variant="label" color={colors.textSecondary}>
                  {professionalLabel}
                </Text>
                {aiAvailable ? (
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync();
                      void onMakeProfessional();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('voiceReport.regenerate')}
                  >
                    <Text variant="caption" color={colors.accent}>
                      {t('voiceReport.regenerate')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={[styles.professionalBox, { backgroundColor: colors.surfaceSunken, borderRadius: radius.md }]}>
                <Text variant="body">{session.professional?.text || t('voiceReport.professionalEmpty')}</Text>
              </View>
              {!aiAvailable ? (
                <Text variant="caption" color={colors.textTertiary}>
                  {t('voiceReport.formatterFallbackHint')}
                </Text>
              ) : null}
            </View>

            <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>
              <Button label={t('voiceReport.tidyUpNotes')} onPress={() => void onMakeProfessional()} />
              <Button label={t('voiceReport.useProfessional')} onPress={onUseProfessional} variant="secondary" />
              <Button label={t('voiceReport.useTranscript')} onPress={onUseTranscript} variant="secondary" />
              <Button label={t('voiceReport.recordAgain')} onPress={() => void onRecordAgain()} variant="tertiary" />
              <Button label={t('common.cancel')} onPress={onClose} variant="tertiary" />
            </View>
          </ScrollView>
        ) : null}

        {phase === 'error' && session?.error ? (
          <View style={{ gap: spacing.md }}>
            <Text variant="body" color={colors.destructive}>
              {session.error.message}
            </Text>
            {session.error.code === 'permission_denied' ? (
              <Button label={t('components.permissionOpenSettings')} onPress={() => Linking.openSettings()} />
            ) : null}
            <Button label={t('voiceReport.recordAgain')} onPress={() => void onRecordAgain()} />
            <Button label={t('common.close')} variant="tertiary" onPress={onClose} />
          </View>
        ) : null}
      </View>
    </BottomSheet>
  );
}

function RecordingBody({
  session,
  onStart,
  onPause,
  onResume,
  onStop,
  onCancel,
}: {
  session: VoiceReportSession | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
}) {
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();
  const phase = session?.phase ?? 'ready';
  const recording = phase === 'recording' || phase === 'paused';
  const remaining = Math.max(0, MAX_RECORDING_MS - (session?.elapsedMs ?? 0));

  return (
    <View style={{ alignItems: 'center', gap: spacing.md }}>
      <View
        style={[
          styles.micWrap,
          {
            backgroundColor: recording ? colors.destructiveSoft : colors.accentSoft,
            borderRadius: radius.pill,
          },
        ]}
      >
        <Ionicons
          name={phase === 'paused' ? 'pause' : 'mic'}
          size={36}
          color={recording ? colors.destructive : colors.accent}
        />
      </View>

      <Text variant="h2" accessibilityLiveRegion="polite">
        {formatElapsed(session?.elapsedMs ?? 0)}
      </Text>
      <Text variant="caption" color={colors.textTertiary}>
        {t('voiceReport.maxDurationHint', { seconds: Math.ceil(remaining / 1000) })}
      </Text>

      <View style={{ width: '100%' }}>
        <LevelMeter level={session?.metering ?? 0} active={phase === 'recording'} />
      </View>

      <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
        {phase === 'paused'
          ? t('voiceReport.pausedBody')
          : recording
            ? t('voiceReport.recordingBody')
            : t('voiceReport.readyBody')}
      </Text>

      <View style={styles.actions}>
        {!recording ? (
          <Button
            label={t('voiceReport.start')}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              void onStart();
            }}
          />
        ) : (
          <>
            {phase === 'recording' ? (
              <Button label={t('voiceReport.pause')} onPress={onPause} variant="secondary" />
            ) : (
              <Button label={t('voiceReport.resume')} onPress={onResume} variant="secondary" />
            )}
            <Button
              label={t('voiceReport.stop')}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                void onStop();
              }}
            />
          </>
        )}
        <Button label={t('common.cancel')} onPress={onCancel} variant="tertiary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  micWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    width: '100%',
    gap: 8,
  },
  processing: {
    padding: 24,
    alignItems: 'center',
  },
  professionalBox: {
    padding: 14,
    minHeight: 88,
  },
});

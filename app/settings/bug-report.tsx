import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button, EmptyState, FIELD_STACK_GAP, NavigationHeader, Screen, Text, TextArea } from '@/components';
import { sendBugReport } from '@/features/settings/bugReport';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

export default function BugReportScreen() {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const [whatHappened, setWhatHappened] = useState('');
  const [expected, setExpected] = useState('');
  const [steps, setSteps] = useState('');
  const [whatError, setWhatError] = useState<string | undefined>();
  const [sendError, setSendError] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    const happened = whatHappened.trim();
    if (!happened) {
      setWhatError(t('bugReport.whatHappenedRequired'));
      return;
    }

    setWhatError(undefined);
    setSendError(false);
    setSending(true);

    try {
      await sendBugReport({
        whatHappened: happened,
        expected,
        steps,
        appVersion: Constants.expoConfig?.version ?? '1.0.0',
        platform: Platform.OS,
      });
      setSent(true);
    } catch (error) {
      logger.error('Bug report delivery failed', error);
      setSendError(true);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <Screen>
        <NavigationHeader title={t('bugReport.title')} onBack={() => router.back()} />
        <View style={{ flex: 1 }} testID="bug-report-sent">
          <EmptyState
            icon="checkmark-circle-outline"
            title={t('bugReport.sentTitle')}
            description={t('bugReport.sentDescription')}
            actionLabel={t('bugReport.done')}
            onAction={() => router.back()}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <NavigationHeader title={t('bugReport.title')} onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: FIELD_STACK_GAP }}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="body" color={colors.textSecondary}>
            {t('bugReport.intro')}
          </Text>

          <TextArea
            label={t('bugReport.whatHappened')}
            placeholder={t('bugReport.whatHappenedPlaceholder')}
            value={whatHappened}
            onChangeText={(value) => {
              setWhatHappened(value);
              if (whatError) setWhatError(undefined);
            }}
            error={whatError}
            minHeight={120}
            testID="bug-report-what-happened"
          />
          <TextArea
            label={t('bugReport.expected')}
            placeholder={t('bugReport.expectedPlaceholder')}
            value={expected}
            onChangeText={setExpected}
            minHeight={90}
            testID="bug-report-expected"
          />
          <TextArea
            label={t('bugReport.steps')}
            placeholder={t('bugReport.stepsPlaceholder')}
            value={steps}
            onChangeText={setSteps}
            minHeight={90}
            testID="bug-report-steps"
          />

          {sendError ? (
            <Text variant="bodySmall" color={colors.destructive} selectable testID="bug-report-send-error">
              {t('bugReport.sendError')}
            </Text>
          ) : null}

          <View style={{ marginTop: spacing.sm }}>
            <Button label={t('bugReport.send')} onPress={() => void handleSend()} loading={sending} testID="bug-report-submit" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

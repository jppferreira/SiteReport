import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet, Button, Text, TextArea } from '@/components';
import {
  bugReportMailtoUrl,
  CONTACT_TOPICS,
  type ContactTopic,
  deliverBugReport,
} from '@/features/settings/bugReport';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

type ContactSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type FieldCopy = {
  intro: string;
  message: string;
  messagePlaceholder: string;
  messageRequired: string;
  detail: string;
  detailPlaceholder: string;
  showSteps: boolean;
  send: string;
  sentTitle: string;
};

function fieldCopy(topic: ContactTopic, t: (key: string) => string): FieldCopy {
  switch (topic) {
    case 'support':
      return {
        intro: t('bugReport.introSupport'),
        message: t('bugReport.messageSupport'),
        messagePlaceholder: t('bugReport.messageSupportPlaceholder'),
        messageRequired: t('bugReport.messageSupportRequired'),
        detail: t('bugReport.detailSupport'),
        detailPlaceholder: t('bugReport.detailSupportPlaceholder'),
        showSteps: false,
        send: t('bugReport.sendSupport'),
        sentTitle: t('bugReport.sentTitleSupport'),
      };
    case 'feature':
      return {
        intro: t('bugReport.introFeature'),
        message: t('bugReport.messageFeature'),
        messagePlaceholder: t('bugReport.messageFeaturePlaceholder'),
        messageRequired: t('bugReport.messageFeatureRequired'),
        detail: t('bugReport.detailFeature'),
        detailPlaceholder: t('bugReport.detailFeaturePlaceholder'),
        showSteps: false,
        send: t('bugReport.sendFeature'),
        sentTitle: t('bugReport.sentTitleFeature'),
      };
    case 'other':
      return {
        intro: t('bugReport.introOther'),
        message: t('bugReport.messageOther'),
        messagePlaceholder: t('bugReport.messageOtherPlaceholder'),
        messageRequired: t('bugReport.messageOtherRequired'),
        detail: t('bugReport.detailOther'),
        detailPlaceholder: t('bugReport.detailOtherPlaceholder'),
        showSteps: false,
        send: t('bugReport.sendOther'),
        sentTitle: t('bugReport.sentTitleOther'),
      };
    default:
      return {
        intro: t('bugReport.intro'),
        message: t('bugReport.whatHappened'),
        messagePlaceholder: t('bugReport.whatHappenedPlaceholder'),
        messageRequired: t('bugReport.whatHappenedRequired'),
        detail: t('bugReport.expected'),
        detailPlaceholder: t('bugReport.expectedPlaceholder'),
        showSteps: true,
        send: t('bugReport.send'),
        sentTitle: t('bugReport.sentTitle'),
      };
  }
}

function topicLabel(topic: ContactTopic, t: (key: string) => string): string {
  switch (topic) {
    case 'support':
      return t('bugReport.topicSupport');
    case 'feature':
      return t('bugReport.topicFeature');
    case 'other':
      return t('bugReport.topicOther');
    default:
      return t('bugReport.topicBug');
  }
}

export function ContactSheet({ visible, onClose }: ContactSheetProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [topic, setTopic] = useState<ContactTopic>('support');
  const [whatHappened, setWhatHappened] = useState('');
  const [expected, setExpected] = useState('');
  const [steps, setSteps] = useState('');
  const [whatError, setWhatError] = useState<string | undefined>();
  const [sendError, setSendError] = useState(false);
  const [mailReady, setMailReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const copy = fieldCopy(topic, t);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    setTopic('support');
    setWhatHappened('');
    setExpected('');
    setSteps('');
    setWhatError(undefined);
    setSendError(false);
    setMailReady(false);
    setSending(false);
    setSent(false);
    setKeyboardHeight(0);
  }, [visible]);

  const draft = () => ({
    topic,
    whatHappened: whatHappened.trim(),
    expected: expected.trim(),
    steps: copy.showSteps ? steps : '',
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    platform: Platform.OS,
  });

  const handleSend = async () => {
    const happened = whatHappened.trim();
    if (!happened) {
      setWhatError(copy.messageRequired);
      return;
    }

    setWhatError(undefined);
    setSendError(false);
    if (mailReady) {
      try {
        await Linking.openURL(bugReportMailtoUrl(draft()));
      } catch (error) {
        logger.error('Contact mail fallback failed', error);
        setMailReady(false);
        setSendError(true);
      }
      return;
    }

    setSending(true);
    try {
      const result = await deliverBugReport(draft(), (url) => Linking.openURL(url));
      if (result === 'mail') {
        setMailReady(true);
        setSent(false);
      } else {
        setSent(true);
        setMailReady(false);
      }
    } catch (error) {
      logger.error('Contact message delivery failed', error);
      setSendError(true);
      setMailReady(false);
    } finally {
      setSending(false);
    }
  };

  const sheetMax = Math.max(360, height - keyboardHeight - insets.top - 12);
  const scrollMax = Math.max(220, sheetMax - insets.bottom - 96);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      dragHandleOnly
      maxHeight={sheetMax}
      bottomOffset={keyboardHeight}
    >
      <Text variant="h3" style={{ marginBottom: spacing.sm }}>
        {t('bugReport.title')}
      </Text>

      {sent ? (
        <View testID="bug-report-sent" style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
          <Text variant="body" color={colors.textSecondary}>
            {copy.sentTitle}. {t('bugReport.sentDescription')}
          </Text>
          <Button label={t('bugReport.done')} onPress={onClose} />
        </View>
      ) : (
        <ScrollView
          style={{ maxHeight: scrollMax }}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xs }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View accessibilityRole="radiogroup" accessibilityLabel={t('bugReport.topicLabel')}>
            <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
              {t('bugReport.topicLabel')}
            </Text>
            <View style={[styles.topics, { gap: spacing.xs }]}>
              {CONTACT_TOPICS.map((option) => {
                const active = option === topic;
                const label = topicLabel(option, t);
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setTopic(option);
                      if (whatError) setWhatError(undefined);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={label}
                    testID={`contact-topic-${option}`}
                    style={[
                      styles.topic,
                      {
                        borderRadius: radius.pill,
                        backgroundColor: active ? colors.accent : colors.surface,
                        borderColor: active ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    <Text variant="bodySmall" color={active ? colors.accentOnAccent : colors.textPrimary}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Text variant="body" color={colors.textSecondary}>
            {copy.intro}
          </Text>

          <TextArea
            label={copy.message}
            placeholder={copy.messagePlaceholder}
            value={whatHappened}
            onChangeText={(value) => {
              setWhatHappened(value);
              if (whatError) setWhatError(undefined);
            }}
            error={whatError}
            minHeight={96}
            testID="bug-report-what-happened"
          />
          <TextArea
            label={copy.detail}
            placeholder={copy.detailPlaceholder}
            value={expected}
            onChangeText={setExpected}
            minHeight={72}
            testID="bug-report-expected"
          />
          {copy.showSteps ? (
            <TextArea
              label={t('bugReport.steps')}
              placeholder={t('bugReport.stepsPlaceholder')}
              value={steps}
              onChangeText={setSteps}
              minHeight={72}
              testID="bug-report-steps"
            />
          ) : null}

          {sendError ? (
            <Text variant="bodySmall" color={colors.destructive} selectable testID="bug-report-send-error">
              {t('bugReport.sendError')}
            </Text>
          ) : null}
          {mailReady ? (
            <Text variant="bodySmall" color={colors.textSecondary} selectable testID="bug-report-mail-ready">
              {t('bugReport.mailFallbackDescription')}
            </Text>
          ) : null}

          <Button
            label={mailReady ? t('bugReport.openMail') : copy.send}
            onPress={() => void handleSend()}
            loading={sending}
            testID="bug-report-submit"
          />
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  topics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topic: {
    paddingHorizontal: 16,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

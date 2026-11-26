import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BottomSheet, Button, Text, ToggleRow } from '@/components';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { DocProBadge } from './DocProBadge';

export type ReminderChannel = 'email' | 'share';

type SendReminderSheetProps = {
  visible: boolean;
  defaultMessage: string;
  loading?: boolean;
  onClose: () => void;
  onSend: (opts: { message: string; channel: ReminderChannel; remindAgain: boolean }) => void;
};

/** Invoice chase sheet: editable copy, channel, and local follow-up toggle. */
export function SendReminderSheet({
  visible,
  defaultMessage,
  loading,
  onClose,
  onSend,
}: SendReminderSheetProps) {
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();
  const { isPro } = useEntitlement();
  const [message, setMessage] = useState(defaultMessage);
  const [channel, setChannel] = useState<ReminderChannel>('share');
  const [remindAgain, setRemindAgain] = useState(true);

  useEffect(() => {
    if (visible) {
      setMessage(defaultMessage);
      setChannel(isPro ? 'email' : 'share');
      setRemindAgain(true);
    }
  }, [visible, defaultMessage, isPro]);

  const selectEmail = () => {
    if (!isPro) {
      router.push({ pathname: '/paywall', params: { trigger: 'branded_email' } });
      return;
    }
    setChannel('email');
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dragHandleOnly maxHeight={640}>
      <View style={{ gap: spacing.md }}>
        <Text variant="h3">{t('documents.reminderSheetTitle')}</Text>

        <View
          style={[
            styles.messageCard,
            {
              borderColor: colors.border,
              backgroundColor: colors.surfaceSunken,
              borderRadius: radius.lg,
              padding: spacing.md,
            },
          ]}
        >
          <Text variant="caption" color={colors.textTertiary} style={{ marginBottom: 6 }}>
            {t('documents.reminderSheetMessage')}
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            style={[styles.messageInput, { color: colors.textPrimary }]}
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        <ChannelRow
          title={t('documents.reminderChannelEmail')}
          subtitle={t('documents.reminderChannelEmailHint')}
          selected={channel === 'email'}
          showPro
          onPress={selectEmail}
        />
        <ChannelRow
          title={t('documents.reminderChannelShare')}
          subtitle={t('documents.reminderChannelShareHint')}
          selected={channel === 'share'}
          onPress={() => setChannel('share')}
        />

        <ToggleRow
          label={t('documents.reminderRemindAgain')}
          description={t('documents.reminderRemindAgainHint')}
          value={remindAgain}
          onValueChange={setRemindAgain}
        />

        <Button
          label={t('documents.reminderSheetSend')}
          variant="accent"
          icon={<Ionicons name="paper-plane-outline" size={20} color={colors.textInverse} />}
          onPress={() => onSend({ message: message.trim(), channel, remindAgain })}
          loading={loading}
          disabled={loading || message.trim().length === 0}
        />
      </View>
    </BottomSheet>
  );
}

function ChannelRow({
  title,
  subtitle,
  selected,
  showPro,
  onPress,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  showPro?: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, radius } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.channelRow,
        {
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="bodyMedium">{title}</Text>
        <Text variant="caption" color={colors.textSecondary}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.channelTrailing}>
        {showPro ? <DocProBadge compact /> : null}
        <View
          style={[
            styles.radio,
            {
              borderColor: selected ? colors.accent : colors.borderStrong,
              backgroundColor: selected ? colors.accent : 'transparent',
            },
          ]}
        >
          {selected ? <Ionicons name="checkmark" size={14} color={colors.textInverse} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  messageCard: { borderWidth: 1 },
  messageInput: {
    minHeight: 96,
    fontSize: 15,
    lineHeight: 22,
    padding: 0,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  channelTrailing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BottomSheet, Button, Text, useToast } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { BusinessProfile, Job, Report } from '@/models';
import { composeReportEmail } from '@/services/mailComposer';
import { useTheme } from '@/theme';
import { formatFileSize } from '@/utils/format';

type SendBrandedEmailSheetProps = {
  visible: boolean;
  onClose: () => void;
  job: Job;
  report: Report;
  business: BusinessProfile | null;
  onSent: (recipientName: string, recipientEmail: string) => void;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function businessMark(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : 'B';
}

/** Bottom sheet matching Figma Field Proof · 07 branded email compose. */
export function SendBrandedEmailSheet({
  visible,
  onClose,
  job,
  report,
  business,
  onSent,
}: SendBrandedEmailSheetProps) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const businessName = business?.businessName?.trim() || t('sendEmail.defaultBusiness');
  const [toName, setToName] = useState(job.customerName?.trim() || '');
  const [toEmail, setToEmail] = useState('');
  const [sending, setSending] = useState(false);

  const subject = useMemo(() => {
    const place = job.address?.trim() ? ` — ${job.address.trim()}` : '';
    return t('sendEmail.subject', { title: job.title, place });
  }, [job.address, job.title, t]);

  const previewBody = useMemo(() => {
    const first = (toName.trim() || t('sendEmail.customerFallback')).split(/\s+/)[0] ?? 'there';
    return t('sendEmail.bodyPreview', { name: first, business: businessName });
  }, [businessName, t, toName]);

  const send = async () => {
    const email = toEmail.trim();
    if (!email.includes('@')) return;
    setSending(true);
    try {
      const body = t('sendEmail.mailBody', {
        name: toName.trim() || t('sendEmail.customerFallback'),
        business: businessName,
        fileName: report.fileName,
      });
      const result = await composeReportEmail({
        recipientEmail: email,
        subject,
        body,
        pdfUri: report.localPdfUri,
        fileName: report.fileName,
      });
      if (result.outcome === 'cancelled') return;
      if (result.outcome === 'unavailable') {
        showToast({ message: result.message, tone: 'warning' });
        return;
      }
      if (result.outcome === 'shared') {
        showToast({ message: result.message, tone: 'neutral' });
      }
      onSent(toName.trim() || email, email);
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dragHandleOnly maxHeight={640}>
      <View style={{ paddingHorizontal: spacing.lg, gap: 12, paddingBottom: spacing.lg }}>
        <View style={styles.header}>
          <Text variant="h3" style={{ flex: 1 }}>
            {t('sendEmail.title')}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={[styles.close, { backgroundColor: colors.surfaceSunken }]}
          >
            <Ionicons name="close" size={15} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View>
          <View style={[styles.field, { borderBottomColor: colors.border }]}>
            <Text variant="bodySmall" color={colors.textTertiary} style={styles.fieldLabel}>
              {t('sendEmail.from')}
            </Text>
            <View style={[styles.mark, { backgroundColor: colors.accent }]}>
              <Text variant="caption" color={colors.ctaDark} style={{ fontWeight: '700', fontSize: 11 }}>
                {businessMark(businessName)}
              </Text>
            </View>
            <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
              {businessName}
            </Text>
          </View>
          <View style={[styles.field, { borderBottomColor: colors.border }]}>
            <Text variant="bodySmall" color={colors.textTertiary} style={styles.fieldLabel}>
              {t('sendEmail.to')}
            </Text>
            <View style={[styles.avatar, { backgroundColor: colors.avatarBg }]}>
              <Text variant="caption" style={{ fontWeight: '600', fontSize: 9 }}>
                {initials(toName || toEmail || 'SM')}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <TextInput
                value={toName}
                onChangeText={setToName}
                placeholder={t('sendEmail.toNamePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                style={{ fontSize: 13.5, fontWeight: '600', color: colors.textPrimary, padding: 0 }}
              />
              <TextInput
                value={toEmail}
                onChangeText={setToEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder={t('sendEmail.toEmailPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                style={{ fontSize: 12.5, color: colors.textSecondary, padding: 0 }}
              />
            </View>
          </View>
          <View style={styles.field}>
            <Text variant="bodySmall" color={colors.textTertiary} style={styles.fieldLabel}>
              {t('sendEmail.subjectLabel')}
            </Text>
            <Text variant="body" style={{ flex: 1, fontSize: 13.5 }} numberOfLines={2}>
              {subject}
            </Text>
          </View>
        </View>

        <View style={[styles.attachment, { backgroundColor: colors.surfaceSunken }]}>
          <View style={[styles.fileIcon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="document-text-outline" size={17} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" numberOfLines={1}>
              {report.fileName}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {formatFileSize(report.fileSize)}
            </Text>
          </View>
          <Ionicons name="attach" size={16} color={colors.textSecondary} />
        </View>

        <View style={[styles.preview, { borderColor: colors.border }]}>
          <View style={[styles.previewHeader, { backgroundColor: colors.ctaDark }]}>
            <View style={[styles.markSmall, { backgroundColor: colors.accent }]}>
              <Text variant="caption" color={colors.ctaDark} style={{ fontWeight: '700', fontSize: 10 }}>
                {businessMark(businessName)}
              </Text>
            </View>
            <Text
              variant="caption"
              color={colors.accent}
              style={{ fontWeight: '600', fontSize: 9, letterSpacing: 0.7 }}
              numberOfLines={1}
            >
              {businessName.toUpperCase()}
            </Text>
          </View>
          <View style={{ padding: 12, gap: 3 }}>
            <Text variant="bodyMedium" style={{ fontSize: 12.5 }}>
              {t('sendEmail.hi', { name: (toName.trim() || t('sendEmail.customerFallback')).split(/\s+/)[0] })}
            </Text>
            <Text variant="caption" color={colors.textSecondary} style={{ lineHeight: 17 }}>
              {previewBody}
            </Text>
          </View>
        </View>

        <Button
          label={t('sendEmail.send')}
          icon={<Ionicons name="send" size={18} color={colors.accentOnAccent} />}
          onPress={send}
          loading={sending}
          disabled={!toEmail.trim().includes('@')}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: {
    width: 58,
  },
  mark: {
    width: 22,
    height: 22,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markSmall: {
    width: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  fileIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
});

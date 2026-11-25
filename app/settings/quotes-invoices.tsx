import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { FIELD_STACK_GAP, Input, NavigationHeader, Screen, Text, TextButton } from '@/components';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useFlushWhenHidden } from '@/hooks/useFlushWhenHidden';
import { useI18n } from '@/i18n/useI18n';
import { formatInvoiceNumber, formatQuoteNumber, isStripePaymentLinkUrl, normalizeStripePaymentLink } from '@/models';
import { useTheme } from '@/theme';
import { goBack } from '@/utils/goBack';

type Draft = {
  bankName: string;
  sortCode: string;
  accountNumber: string;
  paymentTerms: string;
  defaultDueDays: string;
  defaultQuoteValidityDays: string;
  stripePaymentLink: string;
};

export default function QuotesInvoicesSettingsScreen() {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { profile, save } = useBusinessProfile();
  const { isPro } = useEntitlement();

  const [bankName, setBankName] = useState('');
  const [sortCode, setSortCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [defaultDueDays, setDefaultDueDays] = useState('14');
  const [defaultQuoteValidityDays, setDefaultQuoteValidityDays] = useState('30');
  const [stripePaymentLink, setStripePaymentLink] = useState('');
  const [savedState, setSavedState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);
  const draftRef = useRef<Draft>({
    bankName,
    sortCode,
    accountNumber,
    paymentTerms,
    defaultDueDays,
    defaultQuoteValidityDays,
    stripePaymentLink,
  });

  useEffect(() => {
    draftRef.current = {
      bankName,
      sortCode,
      accountNumber,
      paymentTerms,
      defaultDueDays,
      defaultQuoteValidityDays,
      stripePaymentLink,
    };
  }, [bankName, sortCode, accountNumber, paymentTerms, defaultDueDays, defaultQuoteValidityDays, stripePaymentLink]);

  useEffect(() => {
    if (!profile || hydrated.current) return;
    setBankName(profile.bankName ?? '');
    setSortCode(profile.sortCode ?? '');
    setAccountNumber(profile.accountNumber ?? '');
    setPaymentTerms(profile.paymentTerms ?? '');
    setDefaultDueDays(String(profile.defaultDueDays ?? 14));
    setDefaultQuoteValidityDays(String(profile.defaultQuoteValidityDays ?? 30));
    setStripePaymentLink(profile.stripePaymentLink ?? '');
    hydrated.current = true;
  }, [profile]);

  const persist = useCallback(async () => {
    if (!hydrated.current) return;
    const draft = draftRef.current;
    const dueDays = Number(draft.defaultDueDays);
    const validity = Number(draft.defaultQuoteValidityDays);
    setSavedState('saving');
    pendingRef.current = false;
    try {
      await save({
        bankName: draft.bankName.trim() || null,
        sortCode: draft.sortCode.trim() || null,
        accountNumber: draft.accountNumber.trim() || null,
        paymentTerms: draft.paymentTerms.trim() || null,
        defaultDueDays: Number.isFinite(dueDays) ? Math.min(365, Math.max(0, Math.round(dueDays))) : 14,
        defaultQuoteValidityDays: Number.isFinite(validity)
          ? Math.min(365, Math.max(1, Math.round(validity)))
          : 30,
        stripePaymentLink: normalizeStripePaymentLink(draft.stripePaymentLink),
      });
      setSavedState('saved');
    } catch {
      setSavedState('idle');
    }
  }, [save]);

  const scheduleSave = useCallback(() => {
    if (!hydrated.current) return;
    pendingRef.current = true;
    setSavedState('idle');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void persist();
    }, 500);
  }, [persist]);

  useFlushWhenHidden(() => {
    if (pendingRef.current) void persist();
  });

  useEffect(() => {
    if (!hydrated.current) return;
    scheduleSave();
  }, [bankName, sortCode, accountNumber, paymentTerms, defaultDueDays, defaultQuoteValidityDays, stripePaymentLink, scheduleSave]);

  const nextQuote = formatQuoteNumber(profile?.nextQuoteSequence ?? 1);
  const nextInvoice = formatInvoiceNumber(profile?.nextInvoiceSequence ?? 1);
  const stripeLinkInvalid =
    stripePaymentLink.trim().length > 0 && !isStripePaymentLinkUrl(stripePaymentLink.trim());

  return (
    <Screen>
      <NavigationHeader title={t('settings.quotesInvoices')} onBack={() => goBack('/(tabs)/settings')} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: FIELD_STACK_GAP, paddingBottom: spacing.xxl }}
          keyboardShouldPersistTaps="handled"
        >
          {!isPro ? (
            <View
              style={{
                backgroundColor: colors.accentSoft,
                borderRadius: 16,
                padding: spacing.md,
                gap: 8,
              }}
            >
              <Text variant="bodyMedium">{t('settings.quotesInvoicesProTitle')}</Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('settings.quotesInvoicesProBody')}
              </Text>
              <TextButton
                label={t('settings.upgradeToPro')}
                tone="accent"
                onPress={() => router.push({ pathname: '/paywall', params: { trigger: 'quote_invoice' } })}
              />
            </View>
          ) : null}

          <Text variant="label" color={colors.textSecondary}>
            {t('settings.quotesInvoicesNumbering')}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {t('settings.quotesInvoicesNextNumbers', { quote: nextQuote, invoice: nextInvoice })}
          </Text>
          <Text variant="caption" color={colors.textTertiary}>
            {t('settings.quotesInvoicesNumberingHint')}
          </Text>

          <Text variant="label" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
            {t('settings.quotesInvoicesDefaults')}
          </Text>
          <Input
            label={t('businessProfile.defaultDueDays')}
            value={defaultDueDays}
            onChangeText={setDefaultDueDays}
            keyboardType="number-pad"
          />
          <Input
            label={t('settings.defaultQuoteValidityDays')}
            value={defaultQuoteValidityDays}
            onChangeText={setDefaultQuoteValidityDays}
            keyboardType="number-pad"
          />
          <Input
            label={t('businessProfile.paymentTerms')}
            value={paymentTerms}
            onChangeText={setPaymentTerms}
            placeholder={t('businessProfile.paymentTermsPlaceholder')}
          />

          <Text variant="label" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
            {t('businessProfile.bankSection')}
          </Text>
          <Input
            label={t('businessProfile.bankName')}
            value={bankName}
            onChangeText={setBankName}
            placeholder={t('businessProfile.bankNamePlaceholder')}
          />
          <Input
            label={t('businessProfile.sortCode')}
            value={sortCode}
            onChangeText={setSortCode}
            placeholder={t('businessProfile.sortCodePlaceholder')}
          />
          <Input
            label={t('businessProfile.accountNumber')}
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder={t('businessProfile.accountNumberPlaceholder')}
            keyboardType="number-pad"
          />

          <Text variant="label" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
            {t('settings.cardPayments')}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {t('settings.cardPaymentsHint')}
          </Text>
          <Input
            label={t('settings.stripePaymentLink')}
            value={stripePaymentLink}
            onChangeText={setStripePaymentLink}
            placeholder={t('settings.stripePaymentLinkPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {stripeLinkInvalid ? (
            <Text variant="caption" color={colors.destructive}>
              {t('settings.stripePaymentLinkInvalid')}
            </Text>
          ) : null}

          <Text variant="caption" color={colors.textSecondary}>
            {savedState === 'saving'
              ? t('businessProfile.saving')
              : savedState === 'saved'
                ? t('businessProfile.allChangesSaved')
                : ' '}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

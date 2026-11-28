import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CenteredCard, IconButton, NavigationHeader, Screen, useToast } from '@/components';
import { documentsRepository, jobsRepository } from '@/database';
import { NewCustomerForm } from '@/features/documents/NewCustomerForm';
import { useTabletBreakpoint } from '@/hooks/useTabletBreakpoint';
import { useI18n } from '@/i18n/useI18n';
import { normalizeDocumentKind, type Customer } from '@/models';
import { useTheme } from '@/theme';
import { getLayoutTokens } from '@/theme/layoutTokens';
import { goBack } from '@/utils/goBack';
import { logger } from '@/utils/logger';

/**
 * Figma S2 (node 121:954) — dedicated new-customer step in the standalone quote journey.
 * Creates the customer, then either reassigns an existing document or creates one and opens the editor.
 */
export default function NewCustomerScreen() {
  const { kind: kindParam, documentId } = useLocalSearchParams<{ kind?: string; documentId?: string }>();
  const kind = normalizeDocumentKind(kindParam ?? 'quote');
  const { spacing } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const breakpoint = useTabletBreakpoint();
  const layout = getLayoutTokens(breakpoint);
  const [submitting, setSubmitting] = useState(false);

  const handleCreated = async (customer: Customer) => {
    setSubmitting(true);
    try {
      if (typeof documentId === 'string' && documentId) {
        const doc = await documentsRepository.getDocument(documentId);
        if (!doc) {
          showToast({ message: t('documents.notFound'), tone: 'destructive' });
          return;
        }
        await jobsRepository.updateJob(doc.jobId, {
          customerId: customer.id,
          customerName: customer.name,
          address: [customer.address, customer.postcode].filter(Boolean).join(', '),
        });
        router.replace({ pathname: '/document/edit', params: { id: doc.id } });
        return;
      }

      if (kind === 'report') {
        router.replace({
          pathname: '/job/new',
          params: {
            intent: 'report',
            customerName: customer.name,
            ...(customer.address ? { address: customer.address } : {}),
            customerId: customer.id,
          },
        });
        return;
      }

      const created = await documentsRepository.createStandaloneDocument({
        kind,
        customerId: customer.id,
        title: customer.name,
      });
      router.replace({ pathname: '/document/edit', params: { id: created.id } });
    } catch (error) {
      logger.warn('Failed after new customer', {
        error: error instanceof Error ? error.message : String(error),
      });
      showToast({ message: t('documents.toastCreateError'), tone: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <NavigationHeader
        title={t('customers.newCustomer')}
        left={
          <IconButton
            name="close"
            accessibilityLabel={t('common.close')}
            onPress={() => goBack('/document/new')}
          />
        }
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: breakpoint.isTablet ? layout.panePadding : spacing.lg,
            paddingBottom: spacing.xxl + insets.bottom,
            flexGrow: 1,
          }}
        >
          <CenteredCard maxWidth={breakpoint.isTablet ? 600 : undefined}>
            <NewCustomerForm onCreated={handleCreated} submitting={submitting} />
          </CenteredCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

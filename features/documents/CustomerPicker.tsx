import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, SearchInput, Text } from '@/components';
import { customersRepository } from '@/database';
import { useI18n } from '@/i18n/useI18n';
import type { Customer } from '@/models';
import { useTheme } from '@/theme';

import { NewCustomerForm, type NewCustomerFormHandle } from './NewCustomerForm';

export type CustomerPickerHandle = {
  isDrafting: () => boolean;
  /** Saves the open new-customer form. Returns the customer, or null if validation failed. */
  commitDraft: () => Promise<Customer | null>;
};

type CustomerPickerProps = {
  selectedId: string | null;
  onSelect: (customer: Customer) => void;
  onCreated?: (customer: Customer) => void;
  onDraftingChange?: (drafting: boolean) => void;
  /** When set, “New customer” opens the dedicated S2 screen instead of the inline form. */
  onRequestNewCustomer?: () => void;
};

export const CustomerPicker = forwardRef<CustomerPickerHandle, CustomerPickerProps>(
  function CustomerPicker({ selectedId, onSelect, onCreated, onDraftingChange, onRequestNewCustomer }, ref) {
    const { colors, spacing, radius } = useTheme();
    const { t } = useI18n();
    const [search, setSearch] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const formRef = useRef<NewCustomerFormHandle>(null);

    const refresh = useCallback(async () => {
      setLoading(true);
      try {
        const list = await customersRepository.searchCustomers(search);
        setCustomers(list);
      } finally {
        setLoading(false);
      }
    }, [search]);

    useEffect(() => {
      void refresh();
    }, [refresh]);

    useEffect(() => {
      onDraftingChange?.(showNew);
    }, [showNew, onDraftingChange]);

    useImperativeHandle(
      ref,
      () => ({
        isDrafting: () => showNew,
        commitDraft: async () => {
          const created = await formRef.current?.submit() ?? null;
          return created;
        },
      }),
      [showNew]
    );

    const handleCreated = async (customer: Customer) => {
      onSelect(customer);
      onCreated?.(customer);
      setShowNew(false);
      await refresh();
    };

    return (
      <View style={{ gap: spacing.md }}>
        {!showNew ? (
          <>
            <SearchInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('customers.searchPlaceholder')}
            />
            {loading ? (
              <Text variant="caption" color={colors.textSecondary}>
                {t('customers.loading')}
              </Text>
            ) : customers.length === 0 ? (
              <Text variant="caption" color={colors.textSecondary}>
                {t('customers.empty')}
              </Text>
            ) : (
              <View style={{ gap: spacing.xs }}>
                {customers.map((customer) => {
                  const selected = customer.id === selectedId;
                  return (
                    <Pressable
                      key={customer.id}
                      onPress={() => onSelect(customer)}
                      style={[
                        styles.row,
                        {
                          borderColor: selected ? colors.accent : colors.border,
                          borderRadius: radius.lg,
                          padding: spacing.md,
                          backgroundColor: selected ? colors.accentSoft : colors.surface,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium">{customer.name}</Text>
                        {customer.address ? (
                          <Text variant="caption" color={colors.textSecondary}>
                            {customer.address}
                            {customer.postcode ? `, ${customer.postcode}` : ''}
                          </Text>
                        ) : null}
                      </View>
                      {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.accent} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            )}
            <Button
              variant="secondary"
              label={t('customers.newCustomer')}
              onPress={() => {
                if (onRequestNewCustomer) {
                  onRequestNewCustomer();
                  return;
                }
                setShowNew(true);
              }}
            />
          </>
        ) : (
          <View style={{ gap: spacing.md }}>
            <Text variant="h3">{t('customers.newCustomer')}</Text>
            <NewCustomerForm ref={formRef} onCreated={handleCreated} hideSubmit />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                variant="secondary"
                label={t('customers.cancelNew')}
                onPress={() => setShowNew(false)}
                style={{ flex: 1, borderRadius: radius.pill }}
              />
              <Button
                variant="accent"
                label={t('customers.saveCustomer')}
                onPress={() => void formRef.current?.submit()}
                style={{ flex: 1, borderRadius: radius.pill }}
              />
            </View>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});

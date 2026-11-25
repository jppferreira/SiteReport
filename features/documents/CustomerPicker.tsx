import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, FIELD_STACK_GAP, Input, SearchInput, Text } from '@/components';
import { customersRepository } from '@/database';
import { useI18n } from '@/i18n/useI18n';
import type { Customer, CustomerDraft } from '@/models';
import { getStoredGetAddressApiKey } from '@/services/getAddressKey';
import {
  addressLineFromResult,
  lookupPostcode,
  type PostcodeAddress,
} from '@/services/postcodeLookup';
import { useTheme } from '@/theme';

type CustomerPickerProps = {
  selectedId: string | null;
  onSelect: (customer: Customer) => void;
  onCreated?: (customer: Customer) => void;
};

export function CustomerPicker({ selectedId, onSelect, onCreated }: CustomerPickerProps) {
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupHint, setLookupHint] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PostcodeAddress[]>([]);
  const [draft, setDraft] = useState<CustomerDraft>({ name: '' });
  const [nameError, setNameError] = useState<string | null>(null);

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

  const handleLookup = async () => {
    const postcode = draft.postcode?.trim() ?? '';
    if (!postcode) {
      setLookupError(t('customers.postcodeRequired'));
      return;
    }
    setLookingUp(true);
    setLookupError(null);
    setLookupHint(null);
    setSuggestions([]);
    try {
      const apiKey = await getStoredGetAddressApiKey();
      const result = await lookupPostcode(postcode, apiKey);
      if (!result.ok) {
        const map = {
          invalid: t('customers.postcodeInvalid'),
          not_found: t('customers.postcodeNotFound'),
          network: t('customers.postcodeNetwork'),
          rate_limited: t('customers.postcodeRateLimited'),
          unauthorized: t('customers.postcodeUnauthorized'),
          missing_key: t('customers.postcodeLookupHint'),
        } as const;
        setLookupError(map[result.error]);
        return;
      }

      setDraft((prev) => ({ ...prev, postcode: result.addresses[0]?.postcode ?? postcode }));

      if (result.localityOnly) {
        const locality = result.addresses[0];
        setLookupHint(t('customers.postcodeLocalityOnly', { place: locality?.label ?? postcode }));
        if (locality && !draft.address?.trim()) {
          setDraft((prev) => ({
            ...prev,
            postcode: locality.postcode,
            address: [locality.town, locality.county].filter(Boolean).join(', ') || prev.address,
          }));
        }
        return;
      }

      setSuggestions(result.addresses);
      setLookupHint(t('customers.postcodePickAddress', { count: result.addresses.length }));
    } finally {
      setLookingUp(false);
    }
  };

  const applySuggestion = (address: PostcodeAddress) => {
    setDraft((prev) => ({
      ...prev,
      postcode: address.postcode,
      address: addressLineFromResult(address),
    }));
    setSuggestions([]);
    setLookupHint(null);
  };

  const handleCreate = async () => {
    const name = draft.name.trim();
    if (!name) {
      setNameError(t('customers.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      const created = await customersRepository.createCustomer({
        name,
        phone: draft.phone,
        email: draft.email,
        address: draft.address,
        postcode: draft.postcode,
      });
      onSelect(created);
      onCreated?.(created);
      setShowNew(false);
      setDraft({ name: '' });
      setSuggestions([]);
      await refresh();
    } finally {
      setSaving(false);
    }
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
            onPress={() => setShowNew(true)}
          />
        </>
      ) : (
        <View style={{ gap: FIELD_STACK_GAP }}>
          <Text variant="h3">{t('customers.newCustomer')}</Text>
          <Input
            label={t('customers.name')}
            required
            value={draft.name}
            onChangeText={(name) => {
              setDraft((prev) => ({ ...prev, name }));
              if (nameError) setNameError(null);
            }}
            error={nameError ?? undefined}
            autoFocus
          />
          <Input
            label={t('customers.phone')}
            value={draft.phone ?? ''}
            onChangeText={(phone) => setDraft((prev) => ({ ...prev, phone }))}
            keyboardType="phone-pad"
          />
          <Input
            label={t('customers.email')}
            value={draft.email ?? ''}
            onChangeText={(email) => setDraft((prev) => ({ ...prev, email }))}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('customers.postcode')}
                value={draft.postcode ?? ''}
                onChangeText={(postcode) => {
                  setDraft((prev) => ({ ...prev, postcode }));
                  setLookupError(null);
                }}
                autoCapitalize="characters"
              />
            </View>
            <Button
              variant="secondary"
              label={t('customers.findAddress')}
              onPress={() => void handleLookup()}
              loading={lookingUp}
              fullWidth={false}
              style={{ minWidth: 110, marginBottom: 2 }}
            />
          </View>
          {lookupError ? (
            <Text variant="caption" color={colors.destructive}>
              {lookupError}
            </Text>
          ) : null}
          {lookupHint ? (
            <Text variant="caption" color={colors.textSecondary}>
              {lookupHint}
            </Text>
          ) : (
            <Text variant="caption" color={colors.textSecondary}>
              {t('customers.postcodeLookupHint')}
            </Text>
          )}
          {suggestions.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              {suggestions.slice(0, 12).map((address) => (
                <Pressable
                  key={address.label}
                  onPress={() => applySuggestion(address)}
                  style={[
                    styles.row,
                    {
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      padding: spacing.sm,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <Text variant="bodySmall" style={{ flex: 1 }}>
                    {address.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Input
            label={t('customers.address')}
            value={draft.address ?? ''}
            onChangeText={(address) => setDraft((prev) => ({ ...prev, address }))}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              variant="secondary"
              label={t('customers.cancelNew')}
              onPress={() => {
                setShowNew(false);
                setNameError(null);
                setSuggestions([]);
                setLookupError(null);
              }}
              style={{ flex: 1 }}
            />
            <Button label={t('customers.saveCustomer')} onPress={() => void handleCreate()} loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});

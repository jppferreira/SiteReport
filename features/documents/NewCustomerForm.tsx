import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, FIELD_STACK_GAP, FLOATING_FIELD_HEIGHT, Input, Text } from '@/components';
import { LABEL_CLEARANCE } from '@/components/fieldChrome';
import { customersRepository } from '@/database';
import { useI18n } from '@/i18n/useI18n';
import type { Customer, CustomerDraft } from '@/models';
import {
  addressLineFromSuggestion,
  formatUkPostcode,
  isCompleteUkPostcode,
  searchAddresses,
  type AddressSuggestion,
} from '@/services/addressSearch';
import { getUserCoords, type UserCoords } from '@/services/userLocation';
import { useTheme } from '@/theme';

export type NewCustomerFormHandle = {
  /** Validates and saves. Returns the customer, or null if validation failed. */
  submit: () => Promise<Customer | null>;
};

type NewCustomerFormProps = {
  onCreated: (customer: Customer) => void | Promise<void>;
  /** When set, the primary CTA uses this label instead of “Use {name}”. */
  submitLabel?: string;
  submitting?: boolean;
  /** Hide the bottom CTA when a parent screen owns submit (e.g. inline picker). */
  hideSubmit?: boolean;
};

/**
 * Figma S2 — New customer (node 121:954).
 * Name, phone | email, postcode + Find address, selectable results, manual fallback.
 */
export const NewCustomerForm = forwardRef<NewCustomerFormHandle, NewCustomerFormProps>(
  function NewCustomerForm({ onCreated, submitLabel, submitting = false, hideSubmit = false }, ref) {
    const { colors, spacing, radius } = useTheme();
    const { t } = useI18n();
    const [draft, setDraft] = useState<CustomerDraft>({ name: '' });
    const [nameError, setNameError] = useState<string | null>(null);
    const [postcodeError, setPostcodeError] = useState<string | null>(null);
    const [manualAddress, setManualAddress] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchingAddress, setSearchingAddress] = useState(false);
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
    const [lookupHint, setLookupHint] = useState<string | null>(null);
    const [lookupAttempted, setLookupAttempted] = useState(false);
    const userCoordsRef = useRef<UserCoords | null>(null);
    const addressSeq = useRef(0);

    useEffect(() => {
      let active = true;
      void getUserCoords().then((coords) => {
        if (active) userCoordsRef.current = coords;
      });
      return () => {
        active = false;
      };
    }, []);

    const runAddressSearch = useCallback(
      async (raw: string) => {
        const query = raw.trim();
        if (query.length < 3) {
          setSuggestions([]);
          setSearchingAddress(false);
          setLookupHint(null);
          return;
        }

        const seq = ++addressSeq.current;
        setSearchingAddress(true);
        setLookupAttempted(true);
        try {
          if (!userCoordsRef.current) {
            userCoordsRef.current = await getUserCoords();
          }
          const results = await searchAddresses(query, userCoordsRef.current);
          if (seq !== addressSeq.current) return;
          setSuggestions(results);
          setSelectedSuggestionId(null);
          if (results.length > 0) {
            setLookupHint(
              t('customers.addressCountForPostcode', {
                count: results.length,
                postcode: formatUkPostcode(query),
              })
            );
          } else {
            setLookupHint(t('customers.addressNoMatches'));
          }
        } finally {
          if (seq === addressSeq.current) setSearchingAddress(false);
        }
      },
      [t]
    );

    const handleFindAddress = () => {
      setPostcodeError(null);
      setManualAddress(false);
      const postcode = (draft.postcode ?? '').trim();
      if (!postcode) {
        setPostcodeError(t('customers.postcodeRequired'));
        return;
      }
      if (!isCompleteUkPostcode(postcode)) {
        setPostcodeError(t('customers.postcodeInvalid'));
        return;
      }
      const formatted = formatUkPostcode(postcode);
      setDraft((prev) => ({ ...prev, postcode: formatted }));
      void runAddressSearch(formatted);
    };

    const applySuggestion = (suggestion: AddressSuggestion) => {
      const line = addressLineFromSuggestion(suggestion);
      setSelectedSuggestionId(suggestion.id);
      setDraft((prev) => ({
        ...prev,
        address: line || prev.address || suggestion.label,
        postcode: suggestion.postcode ? formatUkPostcode(suggestion.postcode) : prev.postcode,
      }));
    };

    const persist = useCallback(async (): Promise<Customer | null> => {
      const name = draft.name.trim();
      if (!name) {
        setNameError(t('customers.nameRequired'));
        return null;
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
        await onCreated(created);
        return created;
      } finally {
        setSaving(false);
      }
    }, [draft, onCreated, t]);

    useImperativeHandle(ref, () => ({ submit: persist }), [persist]);

    const useLabel =
      submitLabel ??
      (draft.name.trim()
        ? t('customers.useCustomer', { name: draft.name.trim() })
        : t('customers.useCustomerFallback'));

    const showResultsCard = suggestions.length > 0 || (lookupAttempted && !searchingAddress);
    const showManualField = manualAddress || Boolean(draft.address && suggestions.length === 0);

    return (
      <View style={{ flex: 1, gap: spacing.md }}>
        <View style={{ gap: FIELD_STACK_GAP, flex: 1 }}>
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

          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('customers.phone')}
                value={draft.phone ?? ''}
                onChangeText={(phone) => setDraft((prev) => ({ ...prev, phone }))}
                keyboardType="phone-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={t('customers.email')}
                value={draft.email ?? ''}
                onChangeText={(email) => setDraft((prev) => ({ ...prev, email }))}
                placeholder={t('customers.emailOptional')}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.postcodeRow}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('customers.postcode')}
                value={draft.postcode ?? ''}
                onChangeText={(postcode) => {
                  setDraft((prev) => ({ ...prev, postcode }));
                  if (postcodeError) setPostcodeError(null);
                }}
                error={postcodeError ?? undefined}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleFindAddress}
              />
            </View>
            <Button
              label={t('customers.findAddress')}
              onPress={handleFindAddress}
              loading={searchingAddress}
              fullWidth={false}
              style={{
                marginTop: LABEL_CLEARANCE,
                height: FLOATING_FIELD_HEIGHT,
                borderRadius: radius.pill,
                minWidth: 130,
              }}
            />
          </View>

          {searchingAddress ? (
            <View style={styles.lookupStatus}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text variant="caption" color={colors.textSecondary}>
                {t('customers.addressSearching')}
              </Text>
            </View>
          ) : null}

          {showResultsCard ? (
            <View
              style={[
                styles.results,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.sm,
                  gap: 2,
                },
              ]}
            >
              {lookupHint ? (
                <Text variant="caption" color={colors.textTertiary} style={{ paddingHorizontal: 4, paddingBottom: 2 }}>
                  {lookupHint}
                </Text>
              ) : null}
              {suggestions.map((suggestion) => {
                const selected = suggestion.id === selectedSuggestionId;
                const label = addressLineFromSuggestion(suggestion) || suggestion.label;
                return (
                  <Pressable
                    key={suggestion.id}
                    onPress={() => applySuggestion(suggestion)}
                    style={[
                      styles.suggestionRow,
                      {
                        backgroundColor: selected ? colors.accentSoft : 'transparent',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      },
                    ]}
                  >
                    <Ionicons
                      name={selected ? 'location' : 'location-outline'}
                      size={16}
                      color={selected ? colors.accentPressed : colors.textSecondary}
                    />
                    <Text
                      variant={selected ? 'bodyMedium' : 'bodySmall'}
                      color={selected ? colors.accentPressed : colors.textPrimary}
                      style={{ flex: 1, fontSize: 13.5 }}
                    >
                      {label}
                    </Text>
                    {selected ? <Ionicons name="checkmark" size={16} color={colors.accentPressed} /> : null}
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setManualAddress(true)}
                style={{ paddingHorizontal: 4, paddingVertical: 8 }}
              >
                <Text variant="caption" color={colors.accentPressed} style={{ fontWeight: '600', fontSize: 12.5 }}>
                  {t('customers.enterAddressManually')}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {showManualField ? (
            <Input
              label={t('customers.address')}
              value={draft.address ?? ''}
              onChangeText={(address) => setDraft((prev) => ({ ...prev, address }))}
              placeholder={t('customers.addressPlaceholder')}
              autoCorrect={false}
            />
          ) : null}

          <Text variant="caption" color={colors.textTertiary} style={{ fontSize: 12.5 }}>
            {t('customers.savedLocallyHint')}
          </Text>
        </View>

        {!hideSubmit ? (
          <Button
            variant="accent"
            label={useLabel}
            onPress={() => void persist()}
            loading={saving || submitting}
            style={{ borderRadius: radius.pill }}
          />
        ) : null}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  postcodeRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  lookupStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  results: {
    borderWidth: 1,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

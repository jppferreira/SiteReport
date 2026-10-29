import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { FIELD_STACK_GAP, IconButton, Input, Text, TextButton, ToggleRow } from '@/components';
import { useFlushWhenHidden } from '@/hooks/useFlushWhenHidden';
import {
  blankPricingLine,
  formatPence,
  PRICING_CATEGORIES,
  PRICING_CATEGORY_LABELS,
  pricingTotalPence,
  ReportPricing,
  sanitizeAmountInput,
} from '@/models';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { generateId } from '@/utils/id';

const MAX_LINES = 40;

export type PricingReferenceHandle = {
  flush: () => Promise<void>;
};

type PricingReferenceProps = {
  pricing: ReportPricing;
  onSave: (pricing: ReportPricing) => Promise<ReportPricing>;
};

export const PricingReference = forwardRef<PricingReferenceHandle, PricingReferenceProps>(function PricingReference(
  { pricing, onSave },
  ref
) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const [draft, setDraft] = useState(pricing);
  const latest = useRef(pricing);
  const savedJson = useRef(JSON.stringify(pricing));
  const savingJson = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const incoming = JSON.stringify(pricing);
    if (incoming === savedJson.current || incoming === savingJson.current) return;
    setDraft(pricing);
    latest.current = pricing;
    savedJson.current = incoming;
  }, [pricing]);

  const persist = useCallback(
    async (next: ReportPricing) => {
      const json = JSON.stringify(next);
      if (json === savedJson.current) return;
      savingJson.current = json;
      try {
        const stored = await onSave(next);
        savedJson.current = JSON.stringify(stored);
      } finally {
        if (savingJson.current === json) savingJson.current = null;
      }
    },
    [onSave]
  );

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    await persist(latest.current);
  }, [persist]);

  useImperativeHandle(ref, () => ({ flush }), [flush]);
  useFlushWhenHidden(() => {
    void flush();
  });

  const commit = useCallback(
    (next: ReportPricing, immediate: boolean) => {
      latest.current = next;
      setDraft(next);
      if (timer.current) clearTimeout(timer.current);
      if (immediate) {
        void persist(next);
        return;
      }
      timer.current = setTimeout(() => {
        void persist(latest.current);
      }, 600);
    },
    [persist]
  );

  const updateLine = (id: string, patch: Partial<(typeof draft.lines)[number]>, immediate = false) => {
    commit(
      {
        ...latest.current,
        lines: latest.current.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
      },
      immediate
    );
  };

  const total = pricingTotalPence(draft.lines);

  return (
    <View style={{ gap: spacing.md }}>
      <ToggleRow
        label={t('pricing.includeLabel')}
        description={t('pricing.includeDescription')}
        value={draft.enabled}
        onValueChange={(enabled) => {
          const lines =
            enabled && latest.current.lines.length === 0 ? [blankPricingLine(generateId())] : latest.current.lines;
          commit({ enabled, lines }, true);
        }}
      />

      {draft.enabled ? (
        <View style={{ gap: FIELD_STACK_GAP }}>
          {draft.lines.map((line, index) => (
            <View key={line.id} style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label={t('pricing.itemLabel')}
                    placeholder={t('pricing.itemPlaceholder')}
                    value={line.description}
                    onChangeText={(description) => updateLine(line.id, { description })}
                    onBlur={() => void flush()}
                    autoCapitalize="sentences"
                  />
                </View>
                <View style={{ width: 120 }}>
                  <Input
                    label={t('pricing.amountLabel')}
                    placeholder={t('pricing.amountPlaceholder')}
                    value={line.amount}
                    onChangeText={(amount) => updateLine(line.id, { amount: sanitizeAmountInput(amount) })}
                    onBlur={() => void flush()}
                    keyboardType="decimal-pad"
                    accessibilityLabel={t('pricing.amountA11y', { index: index + 1 })}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View style={{ flex: 1, flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
                  {PRICING_CATEGORIES.map((category) => {
                    const active = line.category === category;
                    return (
                      <Pressable
                        key={category}
                        onPress={() => updateLine(line.id, { category }, true)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={t('pricing.categoryA11y', { category: categoryLabel(t, category), index: index + 1 })}
                        style={{
                          paddingHorizontal: 12,
                          height: 32,
                          borderRadius: 999,
                          borderWidth: 1,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: active ? colors.accentSoft : colors.surface,
                          borderColor: active ? colors.accent : colors.border,
                        }}
                      >
                        <Text variant="caption" color={active ? colors.accentPressed : colors.textSecondary}>
                          {categoryLabel(t, category)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <IconButton
                  name="trash-outline"
                  variant="ghost"
                  accessibilityLabel={t('pricing.removeA11y', { index: index + 1 })}
                  onPress={() =>
                    commit(
                      { ...latest.current, lines: latest.current.lines.filter((item) => item.id !== line.id) },
                      true
                    )
                  }
                  color={colors.textSecondary}
                />
              </View>
            </View>
          ))}

          {draft.lines.length < MAX_LINES ? (
            <TextButton
              label={t('pricing.addPrice')}
              align="left"
              tone="accent"
              onPress={() =>
                commit({ ...latest.current, lines: [...latest.current.lines, blankPricingLine(generateId())] }, true)
              }
            />
          ) : null}

          {total !== null ? (
            <Text variant="bodyMedium">{t('pricing.total', { amount: formatPence(total) })}</Text>
          ) : (
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('pricing.emptyHint')}
            </Text>
          )}

          <Text variant="caption" color={colors.textSecondary}>
            {t('pricing.disclaimer')}
          </Text>
        </View>
      ) : null}
    </View>
  );
});


function categoryLabel(t: (key: string) => string, category: keyof typeof PRICING_CATEGORY_LABELS): string {
  if (category === 'materials') return t('pricing.categoryMaterials');
  if (category === 'labour') return t('pricing.categoryLabour');
  return t('pricing.categoryOther');
}

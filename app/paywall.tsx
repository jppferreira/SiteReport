import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, IconButton, LoadingState, PaywallFeature, Screen, Text, TextButton, useToast } from '@/components';
import { PlanOption } from '@/features/paywall/PlanOption';
import { PlanId, ProductInfo } from '@/models';
import { getProducts, purchase, restorePurchases } from '@/services/entitlementService';
import { useTheme } from '@/theme';

const BENEFITS = [
  'Unlimited professional reports',
  'Your logo and branding',
  'Customer sign-off',
  'Custom report styling',
  'All future Pro features',
];

const TRIGGER_COPY: Record<string, string> = {
  free_limit: "You've used all 3 free reports. Upgrade for unlimited reports.",
  signature: 'Customer sign-off is a Pro feature.',
  branding: 'Custom branding is a Pro feature.',
};

export default function PaywallScreen() {
  const { trigger } = useLocalSearchParams<{ trigger?: string }>();
  const { colors, radius, spacing } = useTheme();
  const { showToast } = useToast();
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [selected, setSelected] = useState<PlanId>('annual');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    getProducts().then((result) => {
      setProducts(result);
      setLoading(false);
    });
  }, []);

  const selectedProduct = products.find((p) => p.planId === selected);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const result = await purchase(selected);
      if (result.outcome === 'success') {
        showToast({ message: 'Welcome to Pro', tone: 'success' });
        router.back();
      } else if (result.outcome === 'cancelled') {
        // No toast — a cancelled purchase sheet is not an error.
      } else if (result.outcome === 'pending') {
        showToast({ message: 'Your purchase is pending approval', tone: 'warning' });
      } else {
        showToast({ message: result.message || "We couldn't complete that purchase", tone: 'destructive' });
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.outcome === 'restored') {
        showToast({ message: 'Pro access restored', tone: 'success' });
        router.back();
      } else if (result.outcome === 'nothing_to_restore') {
        showToast({ message: 'No previous purchase found', tone: 'neutral' });
      } else {
        showToast({ message: result.message || "We couldn't restore your purchase", tone: 'destructive' });
      }
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Screen>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.xs }}>
        <IconButton name="close" accessibilityLabel="Close" variant="ghost" onPress={() => router.back()} />
      </View>

      {loading ? (
        <LoadingState />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
          <View style={[styles(spacing).hero, { backgroundColor: colors.ctaDark, borderRadius: radius.xl }]}>
            <Ionicons name="document-text" size={28} color={colors.accent} />
            <View style={{ marginTop: spacing.sm }}>
              <Text variant="caption" color="rgba(255,255,255,0.6)">
                PREVIEW
              </Text>
              <View style={{ height: 6 }} />
              <View style={{ gap: 6 }}>
                <View style={{ height: 8, width: '70%', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 4 }} />
                <View style={{ height: 8, width: '45%', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 4 }} />
              </View>
            </View>
          </View>

          <Text variant="display" style={{ marginTop: spacing.xl }}>
            Professional reports.{'\n'}Unlimited jobs.
          </Text>

          {trigger && TRIGGER_COPY[trigger] ? (
            <Text variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
              {TRIGGER_COPY[trigger]}
            </Text>
          ) : null}

          <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
            {BENEFITS.map((benefit) => (
              <PaywallFeature key={benefit} label={benefit} />
            ))}
          </View>

          <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
            {products.map((product) => (
              <PlanOption
                key={product.planId}
                product={product}
                selected={selected === product.planId}
                onSelect={() => setSelected(product.planId)}
                badge={product.planId === 'annual' ? 'BEST VALUE' : undefined}
              />
            ))}
          </View>

          <View style={{ marginTop: spacing.xl }}>
            <Button
              label={selectedProduct ? `Continue — ${selectedProduct.priceFormatted}` : 'Continue'}
              onPress={handlePurchase}
              loading={purchasing}
            />
          </View>

          <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
            <TextButton label="Restore purchases" onPress={handleRestore} disabled={restoring} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginTop: spacing.sm }}>
            <TextButton label="Terms" onPress={() => router.push('/settings/terms')} />
            <TextButton label="Privacy" onPress={() => router.push('/settings/privacy')} />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function styles(spacing: Record<string, number>) {
  return {
    hero: {
      padding: spacing.lg,
      minHeight: 120,
    },
  } as const;
}

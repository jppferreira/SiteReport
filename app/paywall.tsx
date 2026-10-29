import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, ErrorState, IconButton, LoadingState, PaywallFeature, Screen, Text, TextButton, useToast } from '@/components';
import { PlanOption } from '@/features/paywall/PlanOption';
import { useI18n } from '@/i18n/useI18n';
import { PlanId, ProductInfo } from '@/models';
import { getProducts, purchase, restorePurchases } from '@/services/entitlementService';
import { useTheme } from '@/theme';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/utils/siteUrls';

export default function PaywallScreen() {
  const { trigger } = useLocalSearchParams<{ trigger?: string }>();
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [selected, setSelected] = useState<PlanId>('annual');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const benefits = useMemo(
    () => [
      t('paywall.benefitUnlimited'),
      t('paywall.benefitBranding'),
      t('paywall.benefitSignOff'),
      t('paywall.benefitStyling'),
      t('paywall.benefitFuture'),
    ],
    [t]
  );

  const triggerCopy = useMemo(
    () =>
      ({
        free_limit: t('paywall.triggerFreeLimit'),
        signature: t('paywall.triggerSignature'),
        branding: t('paywall.triggerBranding'),
        logo: t('paywall.triggerLogo'),
        colour: t('paywall.triggerColour'),
        template: t('paywall.triggerTemplate'),
      }) as Record<string, string>,
    [t]
  );

  useEffect(() => {
    let cancelled = false;
    getProducts()
      .then((result) => {
        if (cancelled) return;
        setProducts(result);
        setLoadError(false);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProduct = products.find((p) => p.planId === selected);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const result = await purchase(selected);
      if (result.outcome === 'success') {
        showToast({ message: t('paywall.toastWelcome'), tone: 'success' });
        router.back();
      } else if (result.outcome === 'cancelled') {
        // No toast — a cancelled purchase sheet is not an error.
      } else if (result.outcome === 'pending') {
        showToast({ message: t('paywall.toastPending'), tone: 'warning' });
      } else {
        showToast({ message: result.message || t('paywall.toastPurchaseError'), tone: 'destructive' });
      }
    } catch {
      showToast({
        message: t('paywall.toastPurchaseOffline'),
        tone: 'warning',
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.outcome === 'restored') {
        showToast({ message: t('paywall.toastRestored'), tone: 'success' });
        router.back();
      } else if (result.outcome === 'nothing_to_restore') {
        showToast({ message: t('paywall.toastNothingToRestore'), tone: 'neutral' });
      } else {
        showToast({ message: result.message || t('paywall.toastRestoreError'), tone: 'destructive' });
      }
    } catch {
      showToast({
        message: t('paywall.toastRestoreOffline'),
        tone: 'warning',
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Screen>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.xs }}>
        <IconButton name="close" accessibilityLabel={t('paywall.closeA11y')} variant="ghost" onPress={() => router.back()} />
      </View>

      {loading ? (
        <LoadingState />
      ) : loadError ? (
        <ErrorState
          title={t('paywall.connectionTitle')}
          description={t('paywall.connectionDescription')}
          onAction={() => {
            setLoading(true);
            setLoadError(false);
            getProducts()
              .then((result) => {
                setProducts(result);
                setLoading(false);
              })
              .catch(() => {
                setLoadError(true);
                setLoading(false);
              });
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
          <View style={[styles(spacing).hero, { backgroundColor: colors.ctaDark, borderRadius: radius.xl }]}>
            <Ionicons name="document-text" size={28} color={colors.accent} />
            <View style={{ marginTop: spacing.sm }}>
              <Text variant="caption" color="rgba(255,255,255,0.6)">
                {t('paywall.previewLabel')}
              </Text>
              <View style={{ height: 6 }} />
              <View style={{ gap: 6 }}>
                <View style={{ height: 8, width: '70%', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 4 }} />
                <View style={{ height: 8, width: '45%', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 4 }} />
              </View>
            </View>
          </View>

          <Text variant="display" style={{ marginTop: spacing.xl }}>
            {t('paywall.headline')}
          </Text>

          {trigger && triggerCopy[trigger] ? (
            <Text variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
              {triggerCopy[trigger]}
            </Text>
          ) : null}

          <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
            {benefits.map((benefit) => (
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
                badge={product.planId === 'annual' ? t('paywall.bestValue') : undefined}
              />
            ))}
          </View>

          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.lg, textAlign: 'center' }}>
            {t('paywall.legal')}
          </Text>

          <View style={{ marginTop: spacing.lg }}>
            <Button
              label={
                selectedProduct
                  ? t('paywall.continueWithPrice', { price: selectedProduct.priceFormatted })
                  : t('paywall.continue')
              }
              onPress={handlePurchase}
              loading={purchasing}
            />
          </View>

          <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
            <TextButton label={t('paywall.restore')} onPress={handleRestore} disabled={restoring} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginTop: spacing.sm }}>
            <TextButton label={t('paywall.terms')} onPress={() => void Linking.openURL(TERMS_OF_USE_URL)} />
            <TextButton label={t('paywall.privacy')} onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} />
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

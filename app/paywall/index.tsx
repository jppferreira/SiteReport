import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/core/AppText';
import { Button } from '@/components/core/Button';
import { Card } from '@/components/core/Card';
import { LoadingState } from '@/components/feedback/LoadingState';
import type { BillingPlan, PlanProduct } from '@/models/domain';
import { purchaseService } from '@/services/purchaseService';
import { colors, radius, spacing } from '@/theme';

export default function PaywallScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<PlanProduct[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>('annual');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const fetched = await purchaseService.getProducts();
        setProducts(fetched);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Store products are unavailable right now.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const purchase = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await purchaseService.purchase(selectedPlan);
      setMessage('Purchase started. Complete it in the app store sheet.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Purchase failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await purchaseService.restorePurchases();
      setMessage('Purchases restored.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Restore failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const ctaLabel = useMemo(() => {
    const selected = products.find((product) => product.plan === selectedPlan);
    if (!selected?.displayPrice) {
      return 'Continue';
    }
    return selectedPlan === 'lifetime' ? `Unlock lifetime · ${selected.displayPrice}` : `Start Pro · ${selected.displayPrice}`;
  }, [products, selectedPlan]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState label="Loading plans…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <AppText variant="bodySmall" color={colors.textSecondary}>
            Close
          </AppText>
        </Pressable>
        <AppText variant="h1">Professional reports. Unlimited jobs.</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          Unlock premium branding, customer sign-off and unlimited report generation.
        </AppText>

        <Card style={styles.benefitCard}>
          <Benefit label="Unlimited professional reports" />
          <Benefit label="Your logo and branding" />
          <Benefit label="Customer sign-off" />
          <Benefit label="Custom report styling" />
          <Benefit label="All future Pro features" />
        </Card>

        <View style={styles.planList}>
          <PlanOption
            title="Yearly"
            subtitle={products.find((product) => product.plan === 'annual')?.displayPrice ?? 'Unavailable'}
            badge="Best value"
            selected={selectedPlan === 'annual'}
            onPress={() => setSelectedPlan('annual')}
          />
          <PlanOption
            title="Monthly"
            subtitle={products.find((product) => product.plan === 'monthly')?.displayPrice ?? 'Unavailable'}
            selected={selectedPlan === 'monthly'}
            onPress={() => setSelectedPlan('monthly')}
          />
          <PlanOption
            title="Lifetime"
            subtitle={products.find((product) => product.plan === 'lifetime')?.displayPrice ?? 'Unavailable'}
            selected={selectedPlan === 'lifetime'}
            onPress={() => setSelectedPlan('lifetime')}
          />
        </View>

        {message ? (
          <AppText variant="bodySmall" color={colors.textSecondary}>
            {message}
          </AppText>
        ) : null}

        <Button label={ctaLabel} onPress={() => void purchase()} loading={busy} />
        <Button label="Restore purchases" variant="secondary" onPress={() => void restore()} disabled={busy} />
        <View style={styles.links}>
          <Pressable onPress={() => router.push('/settings/privacy')}>
            <AppText variant="caption" color={colors.textSecondary}>
              Terms
            </AppText>
          </Pressable>
          <Pressable onPress={() => router.push('/settings/privacy')}>
            <AppText variant="caption" color={colors.textSecondary}>
              Privacy
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Benefit({ label }: { label: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.dot} />
      <AppText variant="body">{label}</AppText>
    </View>
  );
}

function PlanOption({
  title,
  subtitle,
  badge,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.planCard, selected && styles.planCardSelected]}>
      <View style={{ gap: spacing.xxs }}>
        <AppText variant="h3">{title}</AppText>
        <AppText variant="bodySmall" color={colors.textSecondary}>
          {subtitle}
        </AppText>
      </View>
      {badge ? (
        <View style={styles.badge}>
          <AppText variant="caption" color={colors.success}>
            {badge}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.x5,
    gap: spacing.md,
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  benefitCard: {
    gap: spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  planList: {
    gap: spacing.sm,
  },
  planCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.large,
    padding: spacing.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planCardSelected: {
    borderColor: colors.cta,
  },
  badge: {
    borderWidth: 1,
    borderColor: `${colors.success}44`,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    backgroundColor: `${colors.success}11`,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
});

import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  hasActiveSubscriptions,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases as restoreStorePurchases,
  type Product,
  type ProductSubscription,
  type Purchase,
  type PurchaseError,
} from 'expo-iap';
import { Platform } from 'react-native';

import { resolveEntitlementType } from '@/features/purchases/entitlement';
import type { BillingPlan, PlanProduct } from '@/models/domain';
import { entitlementService } from '@/services/entitlementService';

const PRODUCT_IDS = {
  monthly: 'com.sitereport.pro.monthly',
  annual: 'com.sitereport.pro.annual',
  lifetime: 'com.sitereport.pro.lifetime',
} as const;

const SUBSCRIPTION_IDS = [PRODUCT_IDS.monthly, PRODUCT_IDS.annual];

let cachedSubscriptions: ProductSubscription[] = [];
let purchaseUpdatedSubscription: { remove: () => void } | null = null;
let purchaseErrorSubscription: { remove: () => void } | null = null;

const toPlan = (productId: string): BillingPlan | null => {
  if (productId === PRODUCT_IDS.monthly) return 'monthly';
  if (productId === PRODUCT_IDS.annual) return 'annual';
  if (productId === PRODUCT_IDS.lifetime) return 'lifetime';
  return null;
};

const productToPlanProduct = (product: Product | ProductSubscription): PlanProduct | null => {
  const plan = toPlan(product.id);
  if (!plan) return null;

  return {
    plan,
    productId: product.id,
    title: product.displayName ?? product.id,
    description: product.description ?? null,
    displayPrice: product.displayPrice ?? null,
    isSubscription: plan === 'monthly' || plan === 'annual',
  };
};

const getSubscriptionOfferToken = (product: ProductSubscription): string | null => {
  if (Platform.OS !== 'android') {
    return null;
  }

  if ('subscriptionOfferDetailsAndroid' in product && Array.isArray(product.subscriptionOfferDetailsAndroid)) {
    const firstOffer = product.subscriptionOfferDetailsAndroid[0];
    if (!firstOffer) {
      return null;
    }
    if ('offerToken' in firstOffer && typeof firstOffer.offerToken === 'string') {
      return firstOffer.offerToken;
    }
  }

  return null;
};

const applyEntitlementFromPurchase = async (purchase: Purchase) => {
  if (purchase.productId === PRODUCT_IDS.lifetime) {
    await entitlementService.setEntitlement({ hasProAccess: true, entitlementType: 'lifetime' });
    return;
  }

  if (SUBSCRIPTION_IDS.includes(purchase.productId)) {
    await entitlementService.setEntitlement({ hasProAccess: true, entitlementType: 'subscription' });
  }
};

export const purchaseService = {
  productIds: PRODUCT_IDS,

  async init() {
    await initConnection();
    purchaseUpdatedSubscription?.remove();
    purchaseErrorSubscription?.remove();

    purchaseUpdatedSubscription = purchaseUpdatedListener(async (purchase) => {
      await applyEntitlementFromPurchase(purchase);
      await finishTransaction({ purchase, isConsumable: false });
    });

    purchaseErrorSubscription = purchaseErrorListener((_error: PurchaseError) => {
      // The caller handles user-visible messages. We intentionally avoid logging sensitive purchase payloads.
    });
  },

  async teardown() {
    purchaseUpdatedSubscription?.remove();
    purchaseErrorSubscription?.remove();
    purchaseUpdatedSubscription = null;
    purchaseErrorSubscription = null;
    await endConnection();
  },

  async getProducts(): Promise<PlanProduct[]> {
    const [subscriptionProducts, inAppProducts] = await Promise.all([
      fetchProducts({ skus: SUBSCRIPTION_IDS, type: 'subs' }),
      fetchProducts({ skus: [PRODUCT_IDS.lifetime], type: 'in-app' }),
    ]);

    cachedSubscriptions = subscriptionProducts as ProductSubscription[];
    return [...subscriptionProducts, ...inAppProducts]
      .map((product) => productToPlanProduct(product as Product | ProductSubscription))
      .filter((value): value is PlanProduct => Boolean(value));
  },

  async purchase(plan: BillingPlan) {
    const productId = PRODUCT_IDS[plan];
    if (plan === 'lifetime') {
      await requestPurchase({
        request: {
          apple: { sku: productId },
          google: { skus: [productId] },
        },
        type: 'in-app',
      });
      return;
    }

    const selectedSub = cachedSubscriptions.find((sub) => sub.id === productId);
    const offerToken = selectedSub ? getSubscriptionOfferToken(selectedSub) : null;
    await requestPurchase({
      request: {
        apple: { sku: productId },
        google: {
          skus: [productId],
          subscriptionOffers: offerToken ? [{ sku: productId, offerToken }] : undefined,
        },
      },
      type: 'subs',
    });
  },

  async restorePurchases() {
    await restoreStorePurchases();
    return this.refreshEntitlements();
  },

  async refreshEntitlements() {
    const [available, hasSubscription] = await Promise.all([
      getAvailablePurchases(),
      hasActiveSubscriptions(SUBSCRIPTION_IDS),
    ]);

    const hasLifetime = available.some((purchase) => purchase.productId === PRODUCT_IDS.lifetime);
    const entitlementType = resolveEntitlementType(hasLifetime, hasSubscription);
    return entitlementService.setEntitlement({
      hasProAccess: entitlementType !== 'none',
      entitlementType,
    });
  },
};

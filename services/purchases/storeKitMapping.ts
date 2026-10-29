import { Entitlement, FREE_ENTITLEMENT, ProductInfo } from '@/models';

import { CatalogItem, catalogItemForApple, catalogItemForPlan } from './catalog';

/** The slice of an App Store product this app needs in order to price a plan. */
export type StoreKitProductSnapshot = {
  id: string;
  displayPrice: string;
  currency: string;
  price?: number | null;
};

export type StoreKitOwnedItem = {
  productId: string;
  purchaseState: 'pending' | 'purchased' | 'unknown';
  /** Milliseconds since epoch. Null for a lifetime purchase, or when StoreKit omits it. */
  expiresAt: number | null;
  autoRenewing: boolean;
  inBillingRetry: boolean;
};

const APPLE_LIFETIME_ID = catalogItemForPlan('lifetime').appleProductId;

export function productInfoFromStoreKit(item: CatalogItem, product: StoreKitProductSnapshot): ProductInfo {
  return {
    planId: item.planId,
    productId: item.appleProductId,
    priceFormatted: product.displayPrice,
    priceValue: product.price ?? 0,
    currencyCode: product.currency,
    periodLabel: item.periodLabel,
  };
}

function isCurrent(item: StoreKitOwnedItem, nowMs: number): boolean {
  if (item.expiresAt == null) return true;
  return item.expiresAt > nowMs;
}

/**
 * Lifetime wins over a subscription. A cancelled subscription stays Pro until
 * its expiration. A billing retry inside the paid period is a grace period.
 */
export function entitlementFromStoreKit(
  items: StoreKitOwnedItem[],
  nowMs: number = Date.now(),
  verifiedAt: string = new Date(nowMs).toISOString(),
): Entitlement {
  const known = items.filter((item) => catalogItemForApple(item.productId));
  const lifetime = known.find((item) => item.productId === APPLE_LIFETIME_ID && item.purchaseState === 'purchased');
  if (lifetime) {
    return {
      status: 'pro',
      planId: 'lifetime',
      subscriptionState: 'active',
      expiresAt: null,
      isLifetime: true,
      lastVerifiedAt: verifiedAt,
    };
  }

  const subscriptions = known.filter((item) => item.productId !== APPLE_LIFETIME_ID && item.purchaseState === 'purchased' && isCurrent(item, nowMs));
  const active = subscriptions.find((item) => item.autoRenewing) ?? subscriptions[0];
  if (active) {
    const plan = catalogItemForApple(active.productId)!;
    return {
      status: 'pro',
      planId: plan.planId,
      subscriptionState: active.inBillingRetry ? 'grace_period' : active.autoRenewing ? 'active' : 'cancelled',
      expiresAt: active.expiresAt == null ? null : new Date(active.expiresAt).toISOString(),
      isLifetime: false,
      lastVerifiedAt: verifiedAt,
    };
  }

  const pending = known.find((item) => item.purchaseState === 'pending');
  if (pending) {
    const plan = catalogItemForApple(pending.productId)!;
    return {
      status: 'free',
      planId: plan.planId,
      subscriptionState: 'pending',
      expiresAt: null,
      isLifetime: false,
      lastVerifiedAt: verifiedAt,
    };
  }

  const expired = known.find((item) => item.purchaseState === 'purchased' && !isCurrent(item, nowMs));
  if (expired) {
    const plan = catalogItemForApple(expired.productId)!;
    return {
      status: 'free',
      planId: plan.planId,
      subscriptionState: 'expired',
      expiresAt: expired.expiresAt == null ? null : new Date(expired.expiresAt).toISOString(),
      isLifetime: false,
      lastVerifiedAt: verifiedAt,
    };
  }

  return FREE_ENTITLEMENT;
}

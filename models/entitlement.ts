export type PlanId = 'monthly' | 'annual' | 'lifetime';

export type EntitlementStatus = 'free' | 'pro';

export type SubscriptionState =
  | 'none'
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'pending'
  | 'grace_period';

export type Entitlement = {
  status: EntitlementStatus;
  planId: PlanId | null;
  subscriptionState: SubscriptionState;
  /** ISO timestamp. Null for lifetime purchases, which never expire. */
  expiresAt: string | null;
  /** True once a lifetime purchase has been verified. */
  isLifetime: boolean;
  /** Last time entitlement was confirmed with the store (or restored). */
  lastVerifiedAt: string | null;
};

export const FREE_ENTITLEMENT: Entitlement = {
  status: 'free',
  planId: null,
  subscriptionState: 'none',
  expiresAt: null,
  isLifetime: false,
  lastVerifiedAt: null,
};

export const FREE_REPORT_LIMIT = 3;

export type ProductInfo = {
  planId: PlanId;
  productId: string;
  priceFormatted: string;
  priceValue: number;
  currencyCode: string;
  periodLabel: string;
};

export type PurchaseResult =
  | { outcome: 'success'; planId: PlanId }
  | { outcome: 'cancelled' }
  | { outcome: 'pending'; planId: PlanId }
  | { outcome: 'error'; message: string };

export type RestoreResult =
  | { outcome: 'restored'; planId: PlanId }
  | { outcome: 'nothing_to_restore' }
  | { outcome: 'error'; message: string };

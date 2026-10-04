import { Entitlement, PlanId, ProductInfo, PurchaseResult, RestoreResult } from '@/models';

/**
 * Abstraction over the platform store (StoreKit / Google Play Billing).
 *
 * The rest of the app never talks to a store SDK directly — it goes through
 * `EntitlementService`, which in turn depends only on this interface. That
 * keeps `hasProAccess()` correct regardless of which concrete store
 * implementation is wired up, and makes the purchase flow testable without
 * a real store connection.
 */
export interface PurchaseService {
  /** Establishes the store connection. Safe to call multiple times. */
  initialize(): Promise<void>;

  /** Fetches localized product/pricing info for all three plans. */
  getProducts(): Promise<ProductInfo[]>;

  /** Starts a purchase flow for the given plan. Resolves once the store flow finishes. */
  purchase(planId: PlanId): Promise<PurchaseResult>;

  /** Restores prior purchases (required by both App Store and Play Store guidelines). */
  restorePurchases(): Promise<RestoreResult>;

  /** Returns the entitlement implied by the store's current receipt/purchase state. */
  getEntitlement(): Promise<Entitlement>;
}

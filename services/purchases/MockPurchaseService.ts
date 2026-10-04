import { Entitlement, FREE_ENTITLEMENT, PlanId, ProductInfo, PurchaseResult, RestoreResult } from '@/models';
import { logger } from '@/utils/logger';
import { getSecureItem, setSecureItem } from '@/utils/secureStorage';

import { PurchaseService } from './PurchaseService';

const STORE_STATE_KEY = 'sitereport.mockStore.state';

/**
 * Development/test adapter that stands in for StoreKit / Play Billing.
 *
 * This sandbox has no App Store or Play Console access and cannot run a
 * signed native build, so real purchases cannot be exercised end-to-end
 * here. This adapter simulates realistic store behaviour — pricing,
 * confirmation delay, cancellation, pending states, subscription expiry —
 * against the exact same `PurchaseService` interface a real adapter would
 * implement, so `EntitlementService` and every screen built against it
 * keep working unmodified when a real store adapter (e.g. backed by
 * `react-native-iap`) is swapped in for production builds. See
 * `services/purchases/README.md` for the production wiring plan.
 */
export type MockStoreState = {
  planId: PlanId | null;
  isLifetime: boolean;
  purchasedAt: string | null;
  /** ISO timestamp; null for lifetime or no purchase. */
  expiresAt: string | null;
  cancelled: boolean;
};

export const EMPTY_STATE: MockStoreState = {
  planId: null,
  isLifetime: false,
  purchasedAt: null,
  expiresAt: null,
  cancelled: false,
};

const PRODUCTS: ProductInfo[] = [
  {
    planId: 'monthly',
    productId: 'sitereport.pro.monthly',
    priceFormatted: '£4.99',
    priceValue: 4.99,
    currencyCode: 'GBP',
    periodLabel: 'per month',
  },
  {
    planId: 'annual',
    productId: 'sitereport.pro.annual',
    priceFormatted: '£29.99',
    priceValue: 29.99,
    currencyCode: 'GBP',
    periodLabel: 'per year',
  },
  {
    planId: 'lifetime',
    productId: 'sitereport.pro.lifetime',
    priceFormatted: '£59.99',
    priceValue: 59.99,
    currencyCode: 'GBP',
    periodLabel: 'once',
  },
];

/** Subscription durations are compressed for the mock so expiry/renewal is observable while testing. */
const SIMULATED_DURATION_MS: Record<'monthly' | 'annual', number> = {
  monthly: 1000 * 60 * 60 * 24 * 30,
  annual: 1000 * 60 * 60 * 24 * 365,
};

async function readState(): Promise<MockStoreState> {
  const raw = await getSecureItem(STORE_STATE_KEY);
  if (!raw) return EMPTY_STATE;
  try {
    return { ...EMPTY_STATE, ...JSON.parse(raw) };
  } catch {
    return EMPTY_STATE;
  }
}

async function writeState(state: MockStoreState): Promise<void> {
  await setSecureItem(STORE_STATE_KEY, JSON.stringify(state));
}

export function entitlementFromState(state: MockStoreState): Entitlement {
  if (!state.planId) return FREE_ENTITLEMENT;

  if (state.isLifetime) {
    return {
      status: 'pro',
      planId: 'lifetime',
      subscriptionState: 'active',
      expiresAt: null,
      isLifetime: true,
      lastVerifiedAt: new Date().toISOString(),
    };
  }

  const now = Date.now();
  const expiresAt = state.expiresAt ? new Date(state.expiresAt).getTime() : 0;
  const isExpired = expiresAt > 0 && now > expiresAt;

  if (isExpired) {
    return {
      status: 'free',
      planId: state.planId,
      subscriptionState: 'expired',
      expiresAt: state.expiresAt,
      isLifetime: false,
      lastVerifiedAt: new Date().toISOString(),
    };
  }

  return {
    status: 'pro',
    planId: state.planId,
    subscriptionState: state.cancelled ? 'cancelled' : 'active',
    expiresAt: state.expiresAt,
    isLifetime: false,
    lastVerifiedAt: new Date().toISOString(),
  };
}

export class MockPurchaseService implements PurchaseService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    logger.debug('MockPurchaseService initialized (no real store connection in this environment)');
  }

  async getProducts(): Promise<ProductInfo[]> {
    await this.initialize();
    return PRODUCTS;
  }

  async purchase(planId: PlanId): Promise<PurchaseResult> {
    await this.initialize();
    // Simulate the store round-trip latency a real purchase sheet would have.
    await new Promise((resolve) => setTimeout(resolve, 900));

    const state: MockStoreState =
      planId === 'lifetime'
        ? { planId, isLifetime: true, purchasedAt: new Date().toISOString(), expiresAt: null, cancelled: false }
        : {
            planId,
            isLifetime: false,
            purchasedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + SIMULATED_DURATION_MS[planId]).toISOString(),
            cancelled: false,
          };

    await writeState(state);
    return { outcome: 'success', planId };
  }

  async restorePurchases(): Promise<RestoreResult> {
    await this.initialize();
    await new Promise((resolve) => setTimeout(resolve, 600));
    const state = await readState();
    if (!state.planId) {
      return { outcome: 'nothing_to_restore' };
    }
    return { outcome: 'restored', planId: state.planId };
  }

  async getEntitlement(): Promise<Entitlement> {
    const state = await readState();
    return entitlementFromState(state);
  }

  /** Test/dev helper: clears the simulated store so Pro can be re-tested from a clean state. */
  async __resetForTesting(): Promise<void> {
    await writeState(EMPTY_STATE);
  }
}

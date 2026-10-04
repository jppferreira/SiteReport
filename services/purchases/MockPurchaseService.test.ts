import { EMPTY_STATE, entitlementFromState, MockStoreState } from './MockPurchaseService';

describe('entitlementFromState', () => {
  it('is free when no purchase has been made', () => {
    expect(entitlementFromState(EMPTY_STATE).status).toBe('free');
  });

  it('is pro and lifetime for a lifetime purchase', () => {
    const state: MockStoreState = {
      planId: 'lifetime',
      isLifetime: true,
      purchasedAt: new Date().toISOString(),
      expiresAt: null,
      cancelled: false,
    };
    const entitlement = entitlementFromState(state);
    expect(entitlement.status).toBe('pro');
    expect(entitlement.isLifetime).toBe(true);
    expect(entitlement.expiresAt).toBeNull();
  });

  it('is pro and active for a subscription that has not expired', () => {
    const state: MockStoreState = {
      planId: 'monthly',
      isLifetime: false,
      purchasedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      cancelled: false,
    };
    const entitlement = entitlementFromState(state);
    expect(entitlement.status).toBe('pro');
    expect(entitlement.subscriptionState).toBe('active');
  });

  it('falls back to free once a subscription has expired', () => {
    const state: MockStoreState = {
      planId: 'monthly',
      isLifetime: false,
      purchasedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
      expiresAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      cancelled: false,
    };
    const entitlement = entitlementFromState(state);
    expect(entitlement.status).toBe('free');
    expect(entitlement.subscriptionState).toBe('expired');
  });

  it('remains pro but reports cancelled subscription state until expiry', () => {
    const state: MockStoreState = {
      planId: 'annual',
      isLifetime: false,
      purchasedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
      cancelled: true,
    };
    const entitlement = entitlementFromState(state);
    expect(entitlement.status).toBe('pro');
    expect(entitlement.subscriptionState).toBe('cancelled');
  });
});

import { catalogItemForPlan } from './catalog';
import { entitlementFromStoreKit, productInfoFromStoreKit } from './storeKitMapping';

const NOW = Date.parse('2026-10-04T12:00:00.000Z');
const NEXT_MONTH = Date.parse('2026-11-04T12:00:00.000Z');
const LAST_MONTH = Date.parse('2026-09-04T12:00:00.000Z');

describe('StoreKit entitlement mapping', () => {
  it('prices each App Store product on its own id', () => {
    const monthly = productInfoFromStoreKit(catalogItemForPlan('monthly'), {
      id: 'tradesreport.pro.monthly',
      displayPrice: '£4.99',
      currency: 'GBP',
      price: 4.99,
    });
    expect(monthly.productId).toBe('tradesreport.pro.monthly');
    expect(monthly.priceFormatted).toBe('£4.99');
    expect(monthly.priceValue).toBe(4.99);
  });

  it('grants lifetime Pro over an active subscription', () => {
    const entitlement = entitlementFromStoreKit(
      [
        {
          productId: 'tradesreport.pro.monthly',
          purchaseState: 'purchased',
          expiresAt: NEXT_MONTH,
          autoRenewing: true,
          inBillingRetry: false,
        },
        {
          productId: 'tradesreport.pro.lifetime',
          purchaseState: 'purchased',
          expiresAt: null,
          autoRenewing: false,
          inBillingRetry: false,
        },
      ],
      NOW,
    );
    expect(entitlement.status).toBe('pro');
    expect(entitlement.isLifetime).toBe(true);
    expect(entitlement.planId).toBe('lifetime');
  });

  it('keeps a cancelled subscription as Pro until it expires', () => {
    const entitlement = entitlementFromStoreKit(
      [
        {
          productId: 'tradesreport.pro.annual',
          purchaseState: 'purchased',
          expiresAt: NEXT_MONTH,
          autoRenewing: false,
          inBillingRetry: false,
        },
      ],
      NOW,
    );
    expect(entitlement.status).toBe('pro');
    expect(entitlement.planId).toBe('annual');
    expect(entitlement.subscriptionState).toBe('cancelled');
    expect(entitlement.expiresAt).toBe(new Date(NEXT_MONTH).toISOString());
  });

  it('treats a billing retry inside the paid period as a grace period', () => {
    const entitlement = entitlementFromStoreKit(
      [
        {
          productId: 'tradesreport.pro.monthly',
          purchaseState: 'purchased',
          expiresAt: NEXT_MONTH,
          autoRenewing: true,
          inBillingRetry: true,
        },
      ],
      NOW,
    );
    expect(entitlement.status).toBe('pro');
    expect(entitlement.subscriptionState).toBe('grace_period');
  });

  it('drops Pro once the subscription period has ended', () => {
    const entitlement = entitlementFromStoreKit(
      [
        {
          productId: 'tradesreport.pro.monthly',
          purchaseState: 'purchased',
          expiresAt: LAST_MONTH,
          autoRenewing: false,
          inBillingRetry: false,
        },
      ],
      NOW,
    );
    expect(entitlement.status).toBe('free');
    expect(entitlement.subscriptionState).toBe('expired');
  });

  it('does not grant Pro for Ask to Buy', () => {
    const entitlement = entitlementFromStoreKit(
      [
        {
          productId: 'tradesreport.pro.monthly',
          purchaseState: 'pending',
          expiresAt: null,
          autoRenewing: false,
          inBillingRetry: false,
        },
      ],
      NOW,
    );
    expect(entitlement.status).toBe('free');
    expect(entitlement.subscriptionState).toBe('pending');
  });
});

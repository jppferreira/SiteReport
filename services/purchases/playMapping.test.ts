import { catalogItemForPlan } from './catalog';
import { entitlementFromPlay, offerTokenFor, productInfoFromPlay, PlayProductSnapshot } from './playMapping';

const monthly = catalogItemForPlan('monthly');
const annual = catalogItemForPlan('annual');

function subscriptionProduct(): PlayProductSnapshot {
  return {
    id: 'tradesreport.pro',
    displayPrice: '£4.99',
    currency: 'GBP',
    price: 4.99,
    subscriptionOfferDetailsAndroid: [
      {
        basePlanId: 'monthly',
        offerId: 'trial',
        offerToken: 'trial-token',
        pricingPhases: {
          pricingPhaseList: [
            { formattedPrice: 'Free', priceAmountMicros: '0', priceCurrencyCode: 'GBP' },
            { formattedPrice: '£4.99', priceAmountMicros: '4990000', priceCurrencyCode: 'GBP' },
          ],
        },
      },
      {
        basePlanId: 'monthly',
        offerId: null,
        offerToken: 'monthly-token',
        pricingPhases: {
          pricingPhaseList: [{ formattedPrice: '£4.99', priceAmountMicros: '4990000', priceCurrencyCode: 'GBP' }],
        },
      },
      {
        basePlanId: 'annual',
        offerId: null,
        offerToken: 'annual-token',
        pricingPhases: {
          pricingPhaseList: [{ formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP' }],
        },
      },
    ],
  };
}

describe('Play subscription mapping', () => {
  const product = subscriptionProduct();

  it('prices each base plan on the shared subscription', () => {
    const month = productInfoFromPlay(monthly, product);
    const year = productInfoFromPlay(annual, product);
    expect(month?.priceFormatted).toBe('£4.99');
    expect(month?.productId).toBe('tradesreport.pro');
    expect(year?.priceFormatted).toBe('£29.99');
    expect(year?.priceValue).toBe(29.99);
  });

  it('purchases the offer token for the selected base plan', () => {
    expect(offerTokenFor(product, 'monthly')).toBe('monthly-token');
    expect(offerTokenFor(product, 'annual')).toBe('annual-token');
  });

  it('grants lifetime Pro over an active subscription', () => {
    const entitlement = entitlementFromPlay([
      { productId: 'tradesreport.pro', basePlanId: 'monthly', purchaseState: 'purchased', autoRenewing: true },
      { productId: 'tradesreport.pro.lifetime', purchaseState: 'purchased', autoRenewing: false },
    ]);
    expect(entitlement.status).toBe('pro');
    expect(entitlement.isLifetime).toBe(true);
  });

  it('keeps a cancelled yearly subscription as Pro while Play still returns it', () => {
    const entitlement = entitlementFromPlay([
      { productId: 'tradesreport.pro', basePlanId: 'annual', purchaseState: 'purchased', autoRenewing: false },
    ]);
    expect(entitlement.status).toBe('pro');
    expect(entitlement.planId).toBe('annual');
    expect(entitlement.subscriptionState).toBe('cancelled');
  });

  it('does not grant Pro for a pending purchase', () => {
    const entitlement = entitlementFromPlay([
      { productId: 'tradesreport.pro', basePlanId: 'monthly', purchaseState: 'pending', autoRenewing: false },
    ]);
    expect(entitlement.status).toBe('free');
    expect(entitlement.subscriptionState).toBe('pending');
  });

  it('is free when Play has no owned products', () => {
    expect(entitlementFromPlay([]).status).toBe('free');
  });

  it('drops lifetime Pro when Play no longer reports the purchase as owned', () => {
    const entitlement = entitlementFromPlay([
      { productId: 'tradesreport.pro.lifetime', purchaseState: 'unknown', autoRenewing: false },
    ]);
    expect(entitlement.status).toBe('free');
    expect(entitlement.isLifetime).toBe(false);
  });
});
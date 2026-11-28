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

  it('purchases the offer token for the selected base plan, preferring promotional offers', () => {
    // With the new logic, promotional offers (those with an offerId) are preferred.
    // The test data has a 'trial' offer for monthly, which is correctly selected.
    expect(offerTokenFor(product, 'monthly')).toBe('trial-token');
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

  it('prices a legacy standalone monthly SKU when basePlanId is omitted on the offer', () => {
    const legacy: PlayProductSnapshot = {
      id: 'monthly',
      displayPrice: '£4.99',
      currency: 'GBP',
      price: 4.99,
      subscriptionOffers: [
        {
          id: '',
          displayPrice: '£4.99',
          price: 4.99,
          currency: 'GBP',
          offerTokenAndroid: 'legacy-monthly-token',
          pricingPhasesAndroid: {
            pricingPhaseList: [{ formattedPrice: '£4.99', priceAmountMicros: '4990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1M' }],
          },
        },
      ],
    };
    const info = productInfoFromPlay(monthly, legacy);
    expect(info?.priceFormatted).toBe('£4.99');
    expect(offerTokenFor(legacy, 'monthly')).toBe('legacy-monthly-token');
  });

  it('matches base plans by billing period when basePlanIdAndroid is missing', () => {
    const product: PlayProductSnapshot = {
      id: 'tradesreport.pro',
      displayPrice: '£4.99',
      currency: 'GBP',
      price: 4.99,
      subscriptionOffers: [
        {
          id: '',
          displayPrice: '£4.99',
          price: 4.99,
          currency: 'GBP',
          offerTokenAndroid: 'period-monthly',
          pricingPhasesAndroid: {
            pricingPhaseList: [{ formattedPrice: '£4.99', priceAmountMicros: '4990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1M' }],
          },
        },
        {
          id: '',
          displayPrice: '£29.99',
          price: 29.99,
          currency: 'GBP',
          offerTokenAndroid: 'period-annual',
          pricingPhasesAndroid: {
            pricingPhaseList: [{ formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' }],
          },
        },
      ],
    };
    expect(productInfoFromPlay(monthly, product)?.priceFormatted).toBe('£4.99');
    expect(productInfoFromPlay(annual, product)?.priceFormatted).toBe('£29.99');
    expect(offerTokenFor(product, 'monthly')).toBe('period-monthly');
    expect(offerTokenFor(product, 'annual')).toBe('period-annual');
  });

  it('drops lifetime Pro when Play no longer reports the purchase as owned', () => {
    const entitlement = entitlementFromPlay([
      { productId: 'tradesreport.pro.lifetime', purchaseState: 'unknown', autoRenewing: false },
    ]);
    expect(entitlement.status).toBe('free');
    expect(entitlement.isLifetime).toBe(false);
  });

  it('prefers a promotional offer (Black Friday) over the base plan for annual subscription', () => {
    const productWithPromo: PlayProductSnapshot = {
      id: 'tradesreport.pro',
      displayPrice: '£29.99',
      currency: 'GBP',
      price: 29.99,
      subscriptionOfferDetailsAndroid: [
        {
          basePlanId: 'annual',
          offerId: 'black-friday-2026',
          offerToken: 'promo-token',
          pricingPhases: {
            pricingPhaseList: [
              { formattedPrice: '£19.99', priceAmountMicros: '19990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' },
              { formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' },
            ],
          },
        },
        {
          basePlanId: 'annual',
          offerId: null,
          offerToken: 'base-token',
          pricingPhases: {
            pricingPhaseList: [{ formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' }],
          },
        },
      ],
    };
    
    const info = productInfoFromPlay(annual, productWithPromo);
    expect(info?.priceFormatted).toBe('£29.99');
    expect(info?.introductoryPriceFormatted).toBe('£19.99');
    expect(info?.introductoryPriceValue).toBe(19.99);
    expect(info?.hasIntroductoryOffer).toBe(true);
    expect(offerTokenFor(productWithPromo, 'annual')).toBe('promo-token');
  });

  it('shows no introductory offer when only the base plan is available', () => {
    const productNoBF: PlayProductSnapshot = {
      id: 'tradesreport.pro',
      displayPrice: '£29.99',
      currency: 'GBP',
      price: 29.99,
      subscriptionOfferDetailsAndroid: [
        {
          basePlanId: 'annual',
          offerId: null,
          offerToken: 'base-token',
          pricingPhases: {
            pricingPhaseList: [{ formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' }],
          },
        },
      ],
    };
    
    const info = productInfoFromPlay(annual, productNoBF);
    expect(info?.priceFormatted).toBe('£29.99');
    expect(info?.introductoryPriceFormatted).toBeUndefined();
    expect(info?.hasIntroductoryOffer).toBe(false);
    expect(offerTokenFor(productNoBF, 'annual')).toBe('base-token');
  });

  it('extracts one-time product discount offer (Black Friday lifetime)', () => {
    const lifetimeItem = catalogItemForPlan('lifetime');
    const lifetimeWithDiscount: PlayProductSnapshot = {
      id: 'tradesreport.pro.lifetime',
      displayPrice: '£79.99',
      currency: 'GBP',
      price: 79.99,
      discountOffers: [
        { displayPrice: '£49.99', price: 49.99 },
      ],
    };
    
    const info = productInfoFromPlay(lifetimeItem, lifetimeWithDiscount);
    expect(info?.priceFormatted).toBe('£79.99');
    expect(info?.introductoryPriceFormatted).toBe('£49.99');
    expect(info?.introductoryPriceValue).toBe(49.99);
    expect(info?.hasIntroductoryOffer).toBe(true);
  });

  it('shows no discount when one-time product has no active offer', () => {
    const lifetimeItem = catalogItemForPlan('lifetime');
    const lifetimeNoDiscount: PlayProductSnapshot = {
      id: 'tradesreport.pro.lifetime',
      displayPrice: '£79.99',
      currency: 'GBP',
      price: 79.99,
      discountOffers: [],
    };
    
    const info = productInfoFromPlay(lifetimeItem, lifetimeNoDiscount);
    expect(info?.priceFormatted).toBe('£79.99');
    expect(info?.introductoryPriceFormatted).toBeUndefined();
    expect(info?.hasIntroductoryOffer).toBe(false);
  });

  it('selects the lowest-priced promotional offer when multiple exist (Black Friday before Cyber Monday)', () => {
    const productWithMultiplePromos: PlayProductSnapshot = {
      id: 'tradesreport.pro',
      displayPrice: '£29.99',
      currency: 'GBP',
      price: 29.99,
      subscriptionOfferDetailsAndroid: [
        {
          basePlanId: 'annual',
          offerId: 'black-friday-2026',
          offerToken: 'bf-token',
          pricingPhases: {
            pricingPhaseList: [
              { formattedPrice: '£19.99', priceAmountMicros: '19990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' },
              { formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' },
            ],
          },
        },
        {
          basePlanId: 'annual',
          offerId: 'cyber-monday-2026',
          offerToken: 'cm-token',
          pricingPhases: {
            pricingPhaseList: [
              { formattedPrice: '£14.99', priceAmountMicros: '14990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' },
              { formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' },
            ],
          },
        },
        {
          basePlanId: 'annual',
          offerId: null,
          offerToken: 'base-token',
          pricingPhases: {
            pricingPhaseList: [{ formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' }],
          },
        },
      ],
    };
    
    const info = productInfoFromPlay(annual, productWithMultiplePromos);
    expect(info?.introductoryPriceFormatted).toBe('£14.99');
    expect(info?.introductoryPriceValue).toBe(14.99);
    expect(info?.hasIntroductoryOffer).toBe(true);
    expect(offerTokenFor(productWithMultiplePromos, 'annual')).toBe('cm-token');
  });

  it('selects the lowest-priced promotional offer when multiple exist (Cyber Monday before Black Friday)', () => {
    const productWithMultiplePromos: PlayProductSnapshot = {
      id: 'tradesreport.pro',
      displayPrice: '£29.99',
      currency: 'GBP',
      price: 29.99,
      subscriptionOfferDetailsAndroid: [
        {
          basePlanId: 'annual',
          offerId: 'cyber-monday-2026',
          offerToken: 'cm-token',
          pricingPhases: {
            pricingPhaseList: [
              { formattedPrice: '£14.99', priceAmountMicros: '14990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' },
              { formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' },
            ],
          },
        },
        {
          basePlanId: 'annual',
          offerId: 'black-friday-2026',
          offerToken: 'bf-token',
          pricingPhases: {
            pricingPhaseList: [
              { formattedPrice: '£19.99', priceAmountMicros: '19990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' },
              { formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' },
            ],
          },
        },
        {
          basePlanId: 'annual',
          offerId: null,
          offerToken: 'base-token',
          pricingPhases: {
            pricingPhaseList: [{ formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' }],
          },
        },
      ],
    };
    
    const info = productInfoFromPlay(annual, productWithMultiplePromos);
    expect(info?.introductoryPriceFormatted).toBe('£14.99');
    expect(info?.introductoryPriceValue).toBe(14.99);
    expect(info?.hasIntroductoryOffer).toBe(true);
    expect(offerTokenFor(productWithMultiplePromos, 'annual')).toBe('cm-token');
  });

  it('selects the lowest-priced offer using normalized format when multiple exist', () => {
    const productNormalized: PlayProductSnapshot = {
      id: 'tradesreport.pro',
      displayPrice: '£29.99',
      currency: 'GBP',
      price: 29.99,
      subscriptionOffers: [
        {
          id: 'black-friday-2026',
          displayPrice: '£19.99',
          price: 19.99,
          currency: 'GBP',
          offerTokenAndroid: 'bf-token',
          basePlanIdAndroid: 'annual',
          pricingPhasesAndroid: {
            pricingPhaseList: [
              { formattedPrice: '£19.99', priceAmountMicros: '19990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' },
              { formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' },
            ],
          },
        },
        {
          id: 'cyber-monday-2026',
          displayPrice: '£14.99',
          price: 14.99,
          currency: 'GBP',
          offerTokenAndroid: 'cm-token',
          basePlanIdAndroid: 'annual',
          pricingPhasesAndroid: {
            pricingPhaseList: [
              { formattedPrice: '£14.99', priceAmountMicros: '14990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' },
              { formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' },
            ],
          },
        },
        {
          id: 'annual',
          displayPrice: '£29.99',
          price: 29.99,
          currency: 'GBP',
          offerTokenAndroid: 'base-token',
          basePlanIdAndroid: 'annual',
          pricingPhasesAndroid: {
            pricingPhaseList: [{ formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' }],
          },
        },
      ],
    };
    
    const info = productInfoFromPlay(annual, productNormalized);
    expect(info?.introductoryPriceFormatted).toBe('£14.99');
    expect(info?.introductoryPriceValue).toBe(14.99);
    expect(info?.hasIntroductoryOffer).toBe(true);
    expect(offerTokenFor(productNormalized, 'annual')).toBe('cm-token');
  });

  it('falls back to base plan when no promotional offers exist', () => {
    const productNoBF: PlayProductSnapshot = {
      id: 'tradesreport.pro',
      displayPrice: '£29.99',
      currency: 'GBP',
      price: 29.99,
      subscriptionOfferDetailsAndroid: [
        {
          basePlanId: 'annual',
          offerId: null,
          offerToken: 'base-token',
          pricingPhases: {
            pricingPhaseList: [{ formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' }],
          },
        },
      ],
    };
    
    const info = productInfoFromPlay(annual, productNoBF);
    expect(info?.priceFormatted).toBe('£29.99');
    expect(info?.introductoryPriceFormatted).toBeUndefined();
    expect(info?.hasIntroductoryOffer).toBe(false);
    expect(offerTokenFor(productNoBF, 'annual')).toBe('base-token');
  });

  it('shows base plan price as recurring for single-phase promotional offer (Black Friday one-year intro)', () => {
    const productWithSinglePhasePromo: PlayProductSnapshot = {
      id: 'tradesreport.pro',
      displayPrice: '£29.99',
      currency: 'GBP',
      price: 29.99,
      subscriptionOfferDetailsAndroid: [
        {
          basePlanId: 'annual',
          offerId: 'black-friday-2026',
          offerToken: 'promo-token',
          pricingPhases: {
            pricingPhaseList: [
              { formattedPrice: '£19.99', priceAmountMicros: '19990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' },
            ],
          },
        },
        {
          basePlanId: 'annual',
          offerId: null,
          offerToken: 'base-token',
          pricingPhases: {
            pricingPhaseList: [{ formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' }],
          },
        },
      ],
    };
    
    const info = productInfoFromPlay(annual, productWithSinglePhasePromo);
    expect(info?.priceFormatted).toBe('£29.99'); // Base plan price
    expect(info?.priceValue).toBe(29.99);
    expect(info?.introductoryPriceFormatted).toBe('£19.99'); // Promo price
    expect(info?.introductoryPriceValue).toBe(19.99);
    expect(info?.hasIntroductoryOffer).toBe(true);
    expect(offerTokenFor(productWithSinglePhasePromo, 'annual')).toBe('promo-token');
  });

  it('shows base plan price as recurring for single-phase promo using normalized format', () => {
    const productNormalized: PlayProductSnapshot = {
      id: 'tradesreport.pro',
      displayPrice: '£29.99',
      currency: 'GBP',
      price: 29.99,
      subscriptionOffers: [
        {
          id: 'black-friday-2026',
          displayPrice: '£19.99',
          price: 19.99,
          currency: 'GBP',
          offerTokenAndroid: 'promo-token',
          basePlanIdAndroid: 'annual',
          pricingPhasesAndroid: {
            pricingPhaseList: [
              { formattedPrice: '£19.99', priceAmountMicros: '19990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' },
            ],
          },
        },
        {
          id: 'annual',
          displayPrice: '£29.99',
          price: 29.99,
          currency: 'GBP',
          offerTokenAndroid: 'base-token',
          basePlanIdAndroid: 'annual',
          pricingPhasesAndroid: {
            pricingPhaseList: [{ formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' }],
          },
        },
      ],
    };
    
    const info = productInfoFromPlay(annual, productNormalized);
    expect(info?.priceFormatted).toBe('£29.99'); // Base plan price
    expect(info?.priceValue).toBe(29.99);
    expect(info?.introductoryPriceFormatted).toBe('£19.99'); // Promo price
    expect(info?.introductoryPriceValue).toBe(19.99);
    expect(info?.hasIntroductoryOffer).toBe(true);
    expect(offerTokenFor(productNormalized, 'annual')).toBe('promo-token');
  });

  it('ignores shared subscription purchase when basePlanId is missing (license tester edge case)', () => {
    // Reproduces the bug where "Pro · Monthly" showed for an annual purchase because
    // basePlanId was null/missing and the code incorrectly fell back to 'monthly'.
    const entitlement = entitlementFromPlay([
      { productId: 'tradesreport.pro', basePlanId: null, purchaseState: 'purchased', autoRenewing: true },
    ]);
    // Should be free (purchase ignored) rather than incorrectly showing as Pro Monthly.
    expect(entitlement.status).toBe('free');
  });

  it('correctly identifies annual purchase when basePlanId is present', () => {
    const entitlement = entitlementFromPlay([
      { productId: 'tradesreport.pro', basePlanId: 'annual', purchaseState: 'purchased', autoRenewing: true },
    ]);
    expect(entitlement.status).toBe('pro');
    expect(entitlement.planId).toBe('annual');
  });

  it('correctly identifies monthly purchase when basePlanId is present', () => {
    const entitlement = entitlementFromPlay([
      { productId: 'tradesreport.pro', basePlanId: 'monthly', purchaseState: 'purchased', autoRenewing: true },
    ]);
    expect(entitlement.status).toBe('pro');
    expect(entitlement.planId).toBe('monthly');
  });

  it('grants Pro for purchased annual subscription after acknowledgment (app launch scenario)', () => {
    // Simulates the scenario where a user completed purchase, app was killed,
    // then on launch getEntitlement() acknowledges the purchase and grants Pro.
    // The PlayPurchaseService now re-queries after acknowledgment to pick up this state.
    const entitlement = entitlementFromPlay([
      { productId: 'tradesreport.pro', basePlanId: 'annual', purchaseState: 'purchased', autoRenewing: true },
    ]);
    expect(entitlement.status).toBe('pro');
    expect(entitlement.planId).toBe('annual');
    expect(entitlement.subscriptionState).toBe('active');
  });

  it('grants Pro for purchased monthly subscription after acknowledgment (app launch scenario)', () => {
    const entitlement = entitlementFromPlay([
      { productId: 'tradesreport.pro', basePlanId: 'monthly', purchaseState: 'purchased', autoRenewing: true },
    ]);
    expect(entitlement.status).toBe('pro');
    expect(entitlement.planId).toBe('monthly');
    expect(entitlement.subscriptionState).toBe('active');
  });

  it('does not grant Pro for pending purchases (payment not yet confirmed)', () => {
    // Pending purchases should not grant Pro until they transition to 'purchased'.
    // This is correct behavior - we wait for payment confirmation.
    const entitlement = entitlementFromPlay([
      { productId: 'tradesreport.pro', basePlanId: 'annual', purchaseState: 'pending', autoRenewing: false },
    ]);
    expect(entitlement.status).toBe('free');
    expect(entitlement.subscriptionState).toBe('pending');
  });
});
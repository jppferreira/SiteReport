import { catalogItemForPlan, PRO_CATALOG, sortProductsByCatalog } from './catalog';
import { offerTokenFor, productInfoFromPlay, PlayProductSnapshot } from './playMapping';

/**
 * Mirrors PlayPurchaseService.getProducts resolution: prefer tradesreport.pro,
 * fall back to legacy monthly/annual SKUs when the shared product has no offers.
 */
function resolveInfos(products: Map<string, PlayProductSnapshot>) {
  return sortProductsByCatalog(
    PRO_CATALOG.flatMap((item) => {
      const primary = products.get(item.productId);
      let product = primary;
      if (item.kind === 'subs' && primary) {
        const info = productInfoFromPlay(item, primary);
        if (!info && item.basePlanId) {
          product = products.get(item.basePlanId) ?? primary;
        } else if (info) {
          return [{ ...info, productId: primary.id }];
        }
      }
      if (item.kind === 'subs' && (!product || product === primary) && item.basePlanId && !productInfoFromPlay(item, primary ?? { id: '', displayPrice: '', currency: '' })) {
        product = products.get(item.basePlanId);
      }
      if (!product && item.basePlanId) product = products.get(item.basePlanId);
      if (!product) return [];
      const mapped =
        item.kind === 'subs' && product.id !== item.productId
          ? { ...item, productId: product.id, basePlanId: item.basePlanId ?? product.id }
          : item;
      const info = productInfoFromPlay(mapped, product);
      return info ? [{ ...info, productId: product.id }] : [];
    })
  );
}

describe('Play catalog resolution for upgrade modal', () => {
  it('shows monthly + annual + lifetime when tradesreport.pro has both base plans', () => {
    const shared: PlayProductSnapshot = {
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
          basePlanIdAndroid: 'monthly',
          offerTokenAndroid: 'm',
          pricingPhasesAndroid: {
            pricingPhaseList: [{ formattedPrice: '£4.99', priceAmountMicros: '4990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1M' }],
          },
        },
        {
          id: '',
          displayPrice: '£29.99',
          price: 29.99,
          currency: 'GBP',
          basePlanIdAndroid: 'annual',
          offerTokenAndroid: 'a',
          pricingPhasesAndroid: {
            pricingPhaseList: [{ formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' }],
          },
        },
      ],
    };
    const lifetime: PlayProductSnapshot = {
      id: 'tradesreport.pro.lifetime',
      displayPrice: '£79.99',
      currency: 'GBP',
      price: 79.99,
    };
    const infos = resolveInfos(new Map([
      [shared.id, shared],
      [lifetime.id, lifetime],
    ]));
    expect(infos.map((p) => p.planId)).toEqual(['monthly', 'annual', 'lifetime']);
    expect(offerTokenFor(shared, 'monthly')).toBe('m');
    expect(offerTokenFor(shared, 'annual')).toBe('a');
  });

  it('falls back to legacy monthly/annual SKUs when shared product has no offers (lifetime-only bug)', () => {
    const sharedEmpty: PlayProductSnapshot = {
      id: 'tradesreport.pro',
      displayPrice: '£4.99',
      currency: 'GBP',
      price: 4.99,
      subscriptionOffers: [],
    };
    const legacyMonthly: PlayProductSnapshot = {
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
          offerTokenAndroid: 'legacy-m',
          pricingPhasesAndroid: {
            pricingPhaseList: [{ formattedPrice: '£4.99', priceAmountMicros: '4990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1M' }],
          },
        },
      ],
    };
    const legacyAnnual: PlayProductSnapshot = {
      id: 'annual',
      displayPrice: '£29.99',
      currency: 'GBP',
      price: 29.99,
      subscriptionOffers: [
        {
          id: '',
          displayPrice: '£29.99',
          price: 29.99,
          currency: 'GBP',
          offerTokenAndroid: 'legacy-a',
          pricingPhasesAndroid: {
            pricingPhaseList: [{ formattedPrice: '£29.99', priceAmountMicros: '29990000', priceCurrencyCode: 'GBP', billingPeriod: 'P1Y' }],
          },
        },
      ],
    };
    const lifetime: PlayProductSnapshot = {
      id: 'tradesreport.pro.lifetime',
      displayPrice: '£79.99',
      currency: 'GBP',
      price: 79.99,
    };

    // Before fix: only lifetime would survive when shared has no offers
    const lifetimeOnly = PRO_CATALOG.flatMap((item) => {
      const product = new Map([
        [sharedEmpty.id, sharedEmpty],
        [lifetime.id, lifetime],
      ]).get(item.productId);
      if (!product) return [];
      const info = productInfoFromPlay(item, product);
      return info ? [info] : [];
    });
    expect(lifetimeOnly.map((p) => p.planId)).toEqual(['lifetime']);

    // After fix: legacy SKUs fill monthly + annual
    const infos = resolveInfos(new Map([
      [sharedEmpty.id, sharedEmpty],
      [legacyMonthly.id, legacyMonthly],
      [legacyAnnual.id, legacyAnnual],
      [lifetime.id, lifetime],
    ]));
    expect(infos.map((p) => p.planId)).toEqual(['monthly', 'annual', 'lifetime']);
    expect(infos[0]!.priceFormatted).toBe('£4.99');
    expect(infos[1]!.priceFormatted).toBe('£29.99');
    expect(catalogItemForPlan('monthly').basePlanId).toBe('monthly');
  });
});

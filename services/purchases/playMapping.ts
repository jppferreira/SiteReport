import { Entitlement, FREE_ENTITLEMENT, ProductInfo } from '@/models';

import { CatalogItem, catalogItemForOwned, catalogItemForPlan, LIFETIME_PRODUCT_ID, PLAY_SUBSCRIPTION_ID } from './catalog';

type PricingPhase = {
  formattedPrice?: string;
  priceAmountMicros?: string;
  priceCurrencyCode?: string;
  billingPeriod?: string;
};

export type PlayOfferDetails = {
  offerToken?: string;
  offerId?: string | null;
  basePlanId?: string;
  pricingPhases?: {
    pricingPhaseList?: PricingPhase[];
  };
};

export type PlaySubscriptionOffer = {
  id?: string;
  displayPrice: string;
  price: number;
  currency?: string;
  paymentMode?: string;
  offerTokenAndroid?: string;
  basePlanIdAndroid?: string;
  pricingPhasesAndroid?: {
    pricingPhaseList: PricingPhase[];
  };
};

/** The slice of a Play product this app needs in order to price and purchase a plan. */
export type PlayProductSnapshot = {
  id: string;
  displayPrice: string;
  currency: string;
  price?: number | null;
  subscriptionOffers?: PlaySubscriptionOffer[];
  subscriptionOfferDetailsAndroid?: PlayOfferDetails[];
  /** One-time product discount offers (expo-iap 5.8+, Play Billing 8.0+) */
  discountOffers?: Array<{ displayPrice: string; price: number }>;
};

export type PlayOwnedItem = {
  productId: string;
  basePlanId?: string | null;
  purchaseState: 'pending' | 'purchased' | 'unknown';
  autoRenewing: boolean;
};

function paidPhases(phases: PricingPhase[] | undefined): PricingPhase[] {
  return (phases ?? []).filter((phase) => Number(phase.priceAmountMicros ?? '0') > 0);
}

function billingPeriodsForBasePlan(basePlanId: string): string[] {
  if (basePlanId === 'monthly') return ['P1M'];
  if (basePlanId === 'annual') return ['P1Y', 'P12M'];
  return [];
}

function phaseMatchesBasePlan(phase: PricingPhase | undefined, basePlanId: string): boolean {
  const period = (phase as PricingPhase & { billingPeriod?: string })?.billingPeriod;
  if (!period) return false;
  return billingPeriodsForBasePlan(basePlanId).includes(period);
}

function detailsForBasePlan(product: PlayProductSnapshot, basePlanId: string): PlayOfferDetails | undefined {
  const all = product.subscriptionOfferDetailsAndroid ?? [];
  const byId = all.filter((offer) => !offer.basePlanId || offer.basePlanId === basePlanId);
  const offers =
    byId.length > 0
      ? byId
      : all.filter((offer) => {
          const phases = offer.pricingPhases?.pricingPhaseList ?? [];
          const recurring = paidPhases(phases).at(-1) ?? phases.at(-1);
          return phaseMatchesBasePlan(recurring, basePlanId);
        });
  if (offers.length === 0) return undefined;

  // When multiple promotional offers exist (e.g., Black Friday 33% off and Cyber Monday 50% off),
  // select the one with the lowest initial/introductory price.
  const promotionalOffers = offers.filter((offer) => offer.offerId);
  if (promotionalOffers.length > 0) {
    // Find the promotional offer with the lowest initial price
    const lowestPriceOffer = promotionalOffers.reduce((best, current) => {
      const bestPhases = paidPhases(best.pricingPhases?.pricingPhaseList);
      const currentPhases = paidPhases(current.pricingPhases?.pricingPhaseList);
      const bestPrice = Number(bestPhases[0]?.priceAmountMicros ?? '0');
      const currentPrice = Number(currentPhases[0]?.priceAmountMicros ?? '0');
      return currentPrice < bestPrice ? current : best;
    });
    return lowestPriceOffer;
  }

  // Fall back to base plan when no promotional offers exist
  return (
    offers.find((offer) => offer.basePlanId === basePlanId && !offer.offerId) ??
    offers.find((offer) => !offer.offerId) ??
    offers.find((offer) => paidPhases(offer.pricingPhases?.pricingPhaseList).length > 0) ??
    offers[0]
  );
}

function normalizedForBasePlan(product: PlayProductSnapshot, basePlanId: string): PlaySubscriptionOffer | undefined {
  const all = product.subscriptionOffers ?? [];
  const byId = all.filter(
    (offer) => offer.basePlanIdAndroid === basePlanId || offer.id === basePlanId
  );
  const offers =
    byId.length > 0
      ? byId
      : all.filter((offer) => {
          const phases = offer.pricingPhasesAndroid?.pricingPhaseList ?? [];
          const recurring = paidPhases(phases).at(-1) ?? phases.at(-1);
          return phaseMatchesBasePlan(recurring, basePlanId);
        });

  // When multiple promotional offers exist, select the one with the lowest initial price.
  const promotionalOffers = offers.filter((offer) => offer.id && offer.id !== basePlanId);
  if (promotionalOffers.length > 0) {
    const lowestPriceOffer = promotionalOffers.reduce((best, current) => {
      const bestPhases = paidPhases(best.pricingPhasesAndroid?.pricingPhaseList);
      const currentPhases = paidPhases(current.pricingPhasesAndroid?.pricingPhaseList);
      const bestPrice = Number(bestPhases[0]?.priceAmountMicros ?? '0');
      const currentPrice = Number(currentPhases[0]?.priceAmountMicros ?? '0');
      return currentPrice < bestPrice ? current : best;
    });
    return lowestPriceOffer;
  }

  // Fall back to base plan when no promotional offers exist
  return (
    offers.find((offer) => !offer.id || offer.id === basePlanId || offer.paymentMode == null) ??
    offers.find((offer) => offer.paymentMode !== 'free-trial') ??
    offers[0]
  );
}

/** Offer token for one base plan. Play requires this when starting a subscription purchase. */
export function offerTokenFor(product: PlayProductSnapshot, basePlanId: string): string | undefined {
  const fromDetails = detailsForBasePlan(product, basePlanId)?.offerToken;
  if (fromDetails) return fromDetails;
  const normalized = normalizedForBasePlan(product, basePlanId)?.offerTokenAndroid;
  if (normalized) return normalized;
  if (product.id === basePlanId) {
    return (
      product.subscriptionOffers?.[0]?.offerTokenAndroid ??
      product.subscriptionOfferDetailsAndroid?.[0]?.offerToken ??
      undefined
    );
  }
  return undefined;
}

export function productInfoFromPlay(item: CatalogItem, product: PlayProductSnapshot): ProductInfo | null {
  if (item.kind === 'in-app') {
    // Check for one-time product discount offers (expo-iap 5.8+, Play Billing 8.0+)
    const discountOffer = product.discountOffers?.[0];
    return {
      planId: item.planId,
      productId: item.productId,
      priceFormatted: product.displayPrice,
      priceValue: product.price ?? 0,
      currencyCode: product.currency,
      periodLabel: item.periodLabel,
      introductoryPriceFormatted: discountOffer?.displayPrice,
      introductoryPriceValue: discountOffer?.price,
      hasIntroductoryOffer: discountOffer != null,
    };
  }

  if (!item.basePlanId) return null;
  const details = detailsForBasePlan(product, item.basePlanId);
  const phases = details?.pricingPhases?.pricingPhaseList;
  const recurring = paidPhases(phases).at(-1) ?? phases?.at(-1);
  let normalized = normalizedForBasePlan(product, item.basePlanId);
  // Legacy Play SKUs (`monthly` / `annual`) are one product → one base plan. If Play
  // omits basePlanId on the offer row, still use the sole available offer.
  if (!details && !normalized && product.id === item.basePlanId) {
    const sole = product.subscriptionOffers?.[0];
    if (sole) normalized = sole;
  }
  if (!details && !normalized) return null;

  // Extract introductory offer pricing (first paid phase before recurring, or first phase if single-phase promo)
  const allPhases = paidPhases(phases);
  const normalizedPhases = paidPhases(normalized?.pricingPhasesAndroid?.pricingPhaseList);
  const hasIntroductoryOffer = details?.offerId != null || (normalized?.id != null && normalized.id !== item.basePlanId);
  let introductoryPriceFormatted: string | undefined;
  let introductoryPriceValue: number | undefined;
  
  // For single-phase promotional offers, we need to find the base plan price separately
  let baseOfferForRecurringPrice: PlayOfferDetails | undefined;
  let baseNormalizedForRecurringPrice: PlaySubscriptionOffer | undefined;
  
  if (hasIntroductoryOffer) {
    // Try to extract intro from details first (subscriptionOfferDetailsAndroid format)
    if (allPhases.length > 0) {
      const introPhase = allPhases.length > 1 ? allPhases[0] : (allPhases[0] !== recurring ? allPhases[0] : undefined);
      if (introPhase) {
        introductoryPriceFormatted = introPhase.formattedPrice;
        introductoryPriceValue = introPhase.priceAmountMicros ? Number(introPhase.priceAmountMicros) / 1_000_000 : undefined;
      } else if (allPhases.length === 1) {
        // Single-phase promo: use this phase as the intro price
        introductoryPriceFormatted = allPhases[0].formattedPrice;
        introductoryPriceValue = allPhases[0].priceAmountMicros ? Number(allPhases[0].priceAmountMicros) / 1_000_000 : undefined;
        
        // Find base plan for recurring price
        const allOffers = product.subscriptionOfferDetailsAndroid ?? [];
        baseOfferForRecurringPrice = allOffers.find((offer) => 
          offer.basePlanId === item.basePlanId && !offer.offerId
        );
      }
    }
    // Fall back to normalized format (subscriptionOffers format)
    else if (normalizedPhases.length > 0) {
      const normalizedRecurring = normalizedPhases.at(-1);
      const introPhase = normalizedPhases.length > 1 ? normalizedPhases[0] : (normalizedPhases[0] !== normalizedRecurring ? normalizedPhases[0] : undefined);
      if (introPhase) {
        introductoryPriceFormatted = introPhase.formattedPrice;
        introductoryPriceValue = introPhase.priceAmountMicros ? Number(introPhase.priceAmountMicros) / 1_000_000 : undefined;
      } else if (normalizedPhases.length === 1) {
        // Single-phase promo: use this phase as the intro price
        introductoryPriceFormatted = normalizedPhases[0].formattedPrice;
        introductoryPriceValue = normalizedPhases[0].priceAmountMicros ? Number(normalizedPhases[0].priceAmountMicros) / 1_000_000 : undefined;
        
        // Find base plan for recurring price
        const allOffers = product.subscriptionOffers ?? [];
        baseNormalizedForRecurringPrice = allOffers.find((offer) => 
          (offer.basePlanIdAndroid === item.basePlanId || offer.id === item.basePlanId) && (!offer.id || offer.id === item.basePlanId)
        );
      }
    }
  }

  // Determine recurring price: use base plan if we found one for a single-phase promo, otherwise use the last phase
  let priceFormatted: string;
  let priceValue: number;
  let currencyCode: string;
  
  if (baseOfferForRecurringPrice) {
    const basePhases = baseOfferForRecurringPrice.pricingPhases?.pricingPhaseList;
    const baseRecurring = paidPhases(basePhases).at(-1) ?? basePhases?.at(-1);
    priceFormatted = baseRecurring?.formattedPrice || product.displayPrice;
    priceValue = baseRecurring?.priceAmountMicros ? Number(baseRecurring.priceAmountMicros) / 1_000_000 : (product.price ?? 0);
    currencyCode = baseRecurring?.priceCurrencyCode || product.currency;
  } else if (baseNormalizedForRecurringPrice) {
    const basePhases = baseNormalizedForRecurringPrice.pricingPhasesAndroid?.pricingPhaseList;
    const baseRecurring = paidPhases(basePhases).at(-1) ?? basePhases?.at(-1);
    priceFormatted = baseRecurring?.formattedPrice || baseNormalizedForRecurringPrice.displayPrice || product.displayPrice;
    priceValue = baseRecurring?.priceAmountMicros 
      ? Number(baseRecurring.priceAmountMicros) / 1_000_000 
      : (baseNormalizedForRecurringPrice.price ?? product.price ?? 0);
    currencyCode = baseRecurring?.priceCurrencyCode || baseNormalizedForRecurringPrice.currency || product.currency;
  } else {
    // Multi-phase promo or no promo: use the recurring phase
    priceFormatted = recurring?.formattedPrice || normalized?.displayPrice || product.displayPrice;
    priceValue = recurring?.priceAmountMicros
      ? Number(recurring.priceAmountMicros) / 1_000_000
      : (normalized?.price ?? product.price ?? 0);
    currencyCode = recurring?.priceCurrencyCode || normalized?.currency || product.currency;
  }

  return {
    planId: item.planId,
    productId: item.productId,
    priceFormatted,
    priceValue,
    currencyCode,
    periodLabel: item.periodLabel,
    introductoryPriceFormatted,
    introductoryPriceValue,
    hasIntroductoryOffer,
  };
}

function planForOwned(item: PlayOwnedItem): CatalogItem | undefined {
  return catalogItemForOwned(item.productId, item.basePlanId) ?? (item.productId === PLAY_SUBSCRIPTION_ID ? catalogItemForPlan('monthly') : undefined);
}

/** Lifetime wins over a subscription. A cancelled subscription stays Pro until Play stops returning it. */
export function entitlementFromPlay(items: PlayOwnedItem[], verifiedAt: string = new Date().toISOString()): Entitlement {
  const known = items.filter((item) => planForOwned(item));
  const lifetime = known.find((item) => item.productId === LIFETIME_PRODUCT_ID && item.purchaseState === 'purchased');
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

  const subscriptions = known.filter((item) => item.productId !== LIFETIME_PRODUCT_ID && item.purchaseState === 'purchased');
  const active = subscriptions.find((item) => item.autoRenewing) ?? subscriptions[0];
  if (active) {
    const plan = planForOwned(active)!;
    return {
      status: 'pro',
      planId: plan.planId,
      subscriptionState: active.autoRenewing ? 'active' : 'cancelled',
      expiresAt: null,
      isLifetime: false,
      lastVerifiedAt: verifiedAt,
    };
  }

  const pending = known.find((item) => item.purchaseState === 'pending');
  if (pending) {
    const plan = planForOwned(pending)!;
    return {
      status: 'free',
      planId: plan.planId,
      subscriptionState: 'pending',
      expiresAt: null,
      isLifetime: false,
      lastVerifiedAt: verifiedAt,
    };
  }

  return FREE_ENTITLEMENT;
}

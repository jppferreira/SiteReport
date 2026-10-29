import { Entitlement, FREE_ENTITLEMENT, ProductInfo } from '@/models';

import { CatalogItem, catalogItemForOwned, catalogItemForPlan, LIFETIME_PRODUCT_ID, PLAY_SUBSCRIPTION_ID } from './catalog';

type PricingPhase = {
  formattedPrice?: string;
  priceAmountMicros?: string;
  priceCurrencyCode?: string;
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

function detailsForBasePlan(product: PlayProductSnapshot, basePlanId: string): PlayOfferDetails | undefined {
  const offers = (product.subscriptionOfferDetailsAndroid ?? []).filter((offer) => !offer.basePlanId || offer.basePlanId === basePlanId);
  if (offers.length === 0) return undefined;
  return (
    offers.find((offer) => offer.basePlanId === basePlanId && !offer.offerId) ??
    offers.find((offer) => !offer.offerId) ??
    offers.find((offer) => paidPhases(offer.pricingPhases?.pricingPhaseList).length > 0) ??
    offers[0]
  );
}

function normalizedForBasePlan(product: PlayProductSnapshot, basePlanId: string): PlaySubscriptionOffer | undefined {
  const offers = (product.subscriptionOffers ?? []).filter((offer) => offer.basePlanIdAndroid === basePlanId);
  return offers.find((offer) => offer.paymentMode !== 'free-trial') ?? offers[0];
}

/** Offer token for one base plan. Play requires this when starting a subscription purchase. */
export function offerTokenFor(product: PlayProductSnapshot, basePlanId: string): string | undefined {
  const fromDetails = detailsForBasePlan(product, basePlanId)?.offerToken;
  if (fromDetails) return fromDetails;
  return normalizedForBasePlan(product, basePlanId)?.offerTokenAndroid ?? undefined;
}

export function productInfoFromPlay(item: CatalogItem, product: PlayProductSnapshot): ProductInfo | null {
  if (item.kind === 'in-app') {
    return {
      planId: item.planId,
      productId: item.productId,
      priceFormatted: product.displayPrice,
      priceValue: product.price ?? 0,
      currencyCode: product.currency,
      periodLabel: item.periodLabel,
    };
  }

  if (!item.basePlanId) return null;
  const details = detailsForBasePlan(product, item.basePlanId);
  const phases = details?.pricingPhases?.pricingPhaseList;
  const recurring = paidPhases(phases).at(-1) ?? phases?.at(-1);
  const normalized = normalizedForBasePlan(product, item.basePlanId);
  if (!details && !normalized) return null;

  const priceFormatted = recurring?.formattedPrice || normalized?.displayPrice || product.displayPrice;
  const priceValue = recurring?.priceAmountMicros
    ? Number(recurring.priceAmountMicros) / 1_000_000
    : (normalized?.price ?? product.price ?? 0);
  const currencyCode = recurring?.priceCurrencyCode || normalized?.currency || product.currency;

  return {
    planId: item.planId,
    productId: item.productId,
    priceFormatted,
    priceValue,
    currencyCode,
    periodLabel: item.periodLabel,
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

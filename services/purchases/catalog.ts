import { PlanId, ProductInfo } from '@/models';

/**
 * Google Play catalog for Trade Report Pro.
 *
 * Subscriptions are one Play product with two base plans. Lifetime is a
 * separate one-time product. Ids must match Play Console exactly.
 *
 * Monetize → Products → Subscriptions → Create subscription
 *   Product ID: tradesreport.pro
 *   Name: Trade Report Pro
 *   Base plan `monthly` — auto-renewing, every month, £4.99 including VAT
 *   Base plan `annual`  — auto-renewing, every year, £29.99 including VAT
 *
 * Monetize → Products → In-app products
 *   Product ID: tradesreport.pro.lifetime — £79.99 including VAT
 *
 * App Store Connect uses one product per plan, in a single subscription group:
 *   tradesreport.pro.monthly, tradesreport.pro.annual, tradesreport.pro.lifetime
 */
export const PLAY_SUBSCRIPTION_ID = 'tradesreport.pro';

export type CatalogItem = {
  planId: PlanId;
  /** Play subscription id, or the one-time product id for lifetime. */
  productId: string;
  /** App Store product id. Apple has no base plans, so each plan is its own product. */
  appleProductId: string;
  /** Set for auto-renewing plans. Play calls this the base plan id. */
  basePlanId?: string;
  kind: 'subs' | 'in-app';
  periodLabel: string;
  /** Used only by the mock store. The live stores supply the real price. */
  mock: Pick<ProductInfo, 'priceFormatted' | 'priceValue' | 'currencyCode'>;
};

export const PRO_CATALOG: CatalogItem[] = [
  {
    planId: 'monthly',
    productId: PLAY_SUBSCRIPTION_ID,
    appleProductId: 'tradesreport.pro.monthly',
    basePlanId: 'monthly',
    kind: 'subs',
    periodLabel: 'per month',
    mock: { priceFormatted: '£4.99', priceValue: 4.99, currencyCode: 'GBP' },
  },
  {
    planId: 'annual',
    productId: PLAY_SUBSCRIPTION_ID,
    appleProductId: 'tradesreport.pro.annual',
    basePlanId: 'annual',
    kind: 'subs',
    periodLabel: 'per year',
    mock: { priceFormatted: '£29.99', priceValue: 29.99, currencyCode: 'GBP' },
  },
  {
    planId: 'lifetime',
    productId: 'tradesreport.pro.lifetime',
    appleProductId: 'tradesreport.pro.lifetime',
    kind: 'in-app',
    periodLabel: 'once',
    mock: { priceFormatted: '£79.99', priceValue: 79.99, currencyCode: 'GBP' },
  },
];

export const SUBSCRIPTION_PRODUCT_IDS = [PLAY_SUBSCRIPTION_ID];

export const LIFETIME_PRODUCT_ID = PRO_CATALOG.find((item) => item.planId === 'lifetime')!.productId;

export function catalogItemForPlan(planId: PlanId): CatalogItem {
  const item = PRO_CATALOG.find((entry) => entry.planId === planId);
  if (!item) throw new Error(`Unknown plan: ${planId}`);
  return item;
}

export function isPlayProduct(productId: string): boolean {
  return PRO_CATALOG.some((item) => item.productId === productId);
}

export function catalogItemForApple(productId: string): CatalogItem | undefined {
  return PRO_CATALOG.find((item) => item.appleProductId === productId);
}

export function isAppleProduct(productId: string): boolean {
  return catalogItemForApple(productId) != null;
}

/** Resolves a Play product, and a base plan when several plans share that product. */
export function catalogItemForOwned(productId: string, basePlanId?: string | null): CatalogItem | undefined {
  const matches = PRO_CATALOG.filter((item) => item.productId === productId);
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  if (!basePlanId) return undefined;
  return matches.find((item) => item.basePlanId === basePlanId);
}

export function productIdForPlan(planId: PlanId): string {
  return catalogItemForPlan(planId).productId;
}

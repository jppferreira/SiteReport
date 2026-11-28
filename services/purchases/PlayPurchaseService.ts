import {
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getActiveSubscriptions,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type ProductOrSubscription,
  type Purchase,
} from 'expo-iap';

import { Entitlement, PlanId, ProductInfo, PurchaseResult, RestoreResult } from '@/models';
import { logger } from '@/utils/logger';

import {
  catalogItemForOwned,
  catalogItemForPlan,
  isPlayProduct,
  LIFETIME_PRODUCT_ID,
  PRO_CATALOG,
  sortProductsByCatalog,
  SUBSCRIPTION_PRODUCT_IDS,
} from './catalog';
import { entitlementFromPlay, offerTokenFor, PlayOwnedItem, PlayProductSnapshot, productInfoFromPlay } from './playMapping';
import { PurchaseService } from './PurchaseService';
import { t } from '@/i18n';

function asSnapshot(product: ProductOrSubscription): PlayProductSnapshot {
  return product as PlayProductSnapshot;
}

/** Prefer the shared `tradesreport.pro` product; fall back to legacy `monthly` / `annual` SKUs. */
function playProductForPlan(
  item: ReturnType<typeof catalogItemForPlan>,
  products: Map<string, ProductOrSubscription>
): ProductOrSubscription | undefined {
  const primary = products.get(item.productId);
  if (item.kind === 'in-app') return primary;
  if (primary) {
    const info = productInfoFromPlay(item, asSnapshot(primary));
    if (info) return primary;
  }
  if (item.basePlanId) {
    const legacy = products.get(item.basePlanId);
    if (legacy) return legacy;
  }
  return primary;
}

function productIdsOf(purchase: Purchase): string[] {
  const ids = (purchase.ids ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (ids.length > 0) return ids;
  return purchase.productId ? [purchase.productId] : [];
}

type StorePurchaseError = {
  code?: ErrorCode;
  message?: string;
  productId?: string | null;
};

function resultFromError(error: StorePurchaseError, planId: PlanId): PurchaseResult {
  if (error.code === ErrorCode.UserCancelled) return { outcome: 'cancelled' };
  if (error.code === ErrorCode.Pending || error.code === ErrorCode.DeferredPayment) {
    return { outcome: 'pending', planId };
  }
  if (error.code === ErrorCode.AlreadyOwned) return { outcome: 'success', planId };
  return { outcome: 'error', message: error.message || t('purchases.couldNotComplete') };
}

/**
 * Google Play Billing adapter. iOS and web keep the mock store; this file is
 * only loaded from the Android entry (`index.android.ts`).
 */
export class PlayPurchaseService implements PurchaseService {
  private initialized = false;
  private connecting: Promise<void> | null = null;
  private products = new Map<string, ProductOrSubscription>();
  private waiters = new Map<PlanId, (result: PurchaseResult) => void>();

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (!this.connecting) {
      this.connecting = this.connect();
    }
    await this.connecting;
  }

  private async connect(): Promise<void> {
    try {
      await initConnection();
      purchaseUpdatedListener((purchase) => {
        void this.handlePurchaseUpdate(purchase);
      });
      purchaseErrorListener((error) => {
        this.handlePurchaseError(error);
      });
      this.initialized = true;
    } catch (error) {
      this.connecting = null;
      throw error;
    }
  }

  async getProducts(): Promise<ProductInfo[]> {
    await this.initialize();
    const [subscriptions, inApp] = await Promise.all([
      fetchProducts({ skus: SUBSCRIPTION_PRODUCT_IDS, type: 'subs' }),
      fetchProducts({ skus: [LIFETIME_PRODUCT_ID], type: 'in-app' }),
    ]);
    const listed = [...(subscriptions ?? []), ...(inApp ?? [])];
    this.products = new Map(listed.map((product) => [product.id, product]));

    const infos = PRO_CATALOG.flatMap((item) => {
      const product = playProductForPlan(item, this.products);
      if (!product) return [];
      const snapshot = asSnapshot(product);
      // Legacy standalone SKUs use the product id as the base plan id.
      const mappedItem =
        item.kind === 'subs' && product.id !== item.productId
          ? { ...item, productId: product.id, basePlanId: item.basePlanId ?? product.id }
          : item;
      const info = productInfoFromPlay(mappedItem, snapshot);
      if (!info) return [];
      // Keep catalog productId for the shared subscription so restore/entitlement stay consistent
      // when Play returns the modern `tradesreport.pro` product; use the resolved id otherwise.
      return [{ ...info, productId: product.id }];
    });
    if (infos.length === 0) {
      throw new Error(t('purchases.googlePlayNoProducts'));
    }
    if (infos.length < PRO_CATALOG.length) {
      logger.warn('Google Play returned a partial Pro catalog', {
        plans: infos.map((info) => info.planId),
        fetchedIds: listed.map((product) => product.id),
      });
    }
    return sortProductsByCatalog(infos);
  }

  async purchase(planId: PlanId): Promise<PurchaseResult> {
    await this.initialize();
    if (this.products.size === 0) {
      await this.getProducts();
    }
    const item = catalogItemForPlan(planId);
    const product = playProductForPlan(item, this.products);
    if (!product) {
      return { outcome: 'error', message: t('purchases.planUnavailableGooglePlay') };
    }
    const sku = product.id;
    const basePlanId = item.basePlanId ?? (sku === 'monthly' || sku === 'annual' ? sku : undefined);
    const offerToken = item.kind === 'subs' && basePlanId ? offerTokenFor(asSnapshot(product), basePlanId) : undefined;
    if (item.kind === 'subs' && !offerToken) {
      return { outcome: 'error', message: t('purchases.subscriptionNoBasePlan') };
    }

    return new Promise<PurchaseResult>((resolve) => {
      this.waiters.set(planId, resolve);
      const snapshot = asSnapshot(product);
      // For one-time products, check if a discount offer is active (expo-iap 5.8+, Play Billing 8.0+).
      // The first discount offer's offerToken should be passed to apply the Black Friday discount.
      const inAppOfferToken = item.kind === 'in-app' ? (snapshot.discountOffers?.[0] as any)?.offerTokenAndroid : undefined;
      const request =
        item.kind === 'subs'
          ? requestPurchase({
              request: {
                google: {
                  skus: [sku],
                  subscriptionOffers: [{ sku, offerToken: offerToken! }],
                },
              },
              type: 'subs',
            })
          : requestPurchase({
              request: { google: { skus: [sku], offerToken: inAppOfferToken } },
              type: 'in-app',
            });

      request.catch((error: unknown) => {
        this.waiters.delete(planId);
        const message = error instanceof Error ? error.message : t('purchases.couldNotComplete');
        resolve({ outcome: 'error', message });
      });
    });
  }

  async restorePurchases(): Promise<RestoreResult> {
    await this.initialize();
    const entitlement = await this.getEntitlement();
    if (entitlement.status !== 'pro' || !entitlement.planId) {
      return { outcome: 'nothing_to_restore' };
    }
    return { outcome: 'restored', planId: entitlement.planId };
  }

  async getEntitlement(): Promise<Entitlement> {
    await this.initialize();
    let [purchases, activeSubscriptions] = await Promise.all([
      getAvailablePurchases(),
      getActiveSubscriptions(SUBSCRIPTION_PRODUCT_IDS).catch(() => []),
    ]);
    
    // Acknowledge any unacknowledged purchases first, then re-query to pick up state changes
    let acknowledgedAny = false;
    for (const purchase of purchases) {
      if ('isSuspendedAndroid' in purchase && purchase.isSuspendedAndroid) continue;
      if (purchase.purchaseState === 'purchased' && 'isAcknowledgedAndroid' in purchase && purchase.isAcknowledgedAndroid === false) {
        logger.info('Acknowledging unacknowledged Google Play purchase on entitlement query', {
          productIds: productIdsOf(purchase),
          purchaseState: purchase.purchaseState,
        });
        await finishTransaction({ purchase, isConsumable: false }).catch((error: unknown) => {
          logger.warn('Failed to acknowledge an existing Google Play purchase', { error: String(error) });
        });
        acknowledgedAny = true;
      }
    }
    
    // Re-query after acknowledgment to ensure we have the latest state
    if (acknowledgedAny) {
      [purchases, activeSubscriptions] = await Promise.all([
        getAvailablePurchases(),
        getActiveSubscriptions(SUBSCRIPTION_PRODUCT_IDS).catch(() => []),
      ]);
    }
    
    const activeByProduct = new Map(activeSubscriptions.map((subscription) => [subscription.productId, subscription]));

    const items: PlayOwnedItem[] = [];
    const seen = new Set<string>();
    for (const purchase of purchases) {
      if ('isSuspendedAndroid' in purchase && purchase.isSuspendedAndroid) continue;
      const baseState =
        purchase.purchaseState === 'pending' || purchase.purchaseState === 'purchased'
          ? purchase.purchaseState
          : 'unknown';
      for (const productId of productIdsOf(purchase)) {
        if (!isPlayProduct(productId)) continue;
        const active = activeByProduct.get(productId);
        const purchaseState = baseState === 'unknown' && active?.isActive ? 'purchased' : baseState;
        items.push({
          productId,
          basePlanId: purchase.currentPlanId ?? active?.currentPlanId ?? active?.basePlanIdAndroid ?? null,
          purchaseState,
          autoRenewing: active?.autoRenewingAndroid === true || purchase.isAutoRenewing === true,
        });
        seen.add(productId);
      }
    }
    for (const subscription of activeSubscriptions) {
      if (!subscription.isActive || !isPlayProduct(subscription.productId) || seen.has(subscription.productId)) {
        continue;
      }
      items.push({
        productId: subscription.productId,
        basePlanId: subscription.currentPlanId ?? subscription.basePlanIdAndroid ?? null,
        purchaseState: 'purchased',
        autoRenewing: subscription.autoRenewingAndroid === true,
      });
      seen.add(subscription.productId);
    }
    return entitlementFromPlay(items);
  }

  private async handlePurchaseUpdate(purchase: Purchase): Promise<void> {
    const plan = this.planForPurchase(purchase);
    if (!plan) return;

    if (purchase.purchaseState === 'pending') {
      this.settle(plan.planId, { outcome: 'pending', planId: plan.planId });
      return;
    }
    try {
      await finishTransaction({ purchase, isConsumable: false });
      this.settle(plan.planId, { outcome: 'success', planId: plan.planId });
    } catch (error) {
      logger.warn('Failed to acknowledge Google Play purchase', { error: String(error), productId: plan.productId });
      this.settle(plan.planId, { outcome: 'error', message: t('purchases.couldNotConfirmGooglePlay') });
    }
  }

  private handlePurchaseError(error: StorePurchaseError): void {
    const plan = this.pendingPlan();
    if (!plan) return;
    this.settle(plan.planId, resultFromError(error, plan.planId));
  }

  private planForPurchase(purchase: Purchase): ReturnType<typeof catalogItemForPlan> | undefined {
    const ids = productIdsOf(purchase).filter(isPlayProduct);
    if (ids.length === 0) return undefined;
    for (const productId of ids) {
      const match = catalogItemForOwned(productId, purchase.currentPlanId);
      if (match) return match;
    }
    return this.pendingPlan();
  }

  private pendingPlan(): ReturnType<typeof catalogItemForPlan> | undefined {
    if (this.waiters.size !== 1) return undefined;
    const planId = this.waiters.keys().next().value;
    return planId ? catalogItemForPlan(planId) : undefined;
  }

  private settle(planId: PlanId, result: PurchaseResult): void {
    const resolve = this.waiters.get(planId);
    if (!resolve) return;
    this.waiters.delete(planId);
    resolve(result);
  }
}

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
  restorePurchases as syncStorePurchases,
  type ActiveSubscription,
  type ProductOrSubscription,
  type Purchase,
} from 'expo-iap';

import { Entitlement, PlanId, ProductInfo, PurchaseResult, RestoreResult } from '@/models';
import { logger } from '@/utils/logger';

import { catalogItemForApple, catalogItemForPlan, isAppleProduct, PRO_CATALOG } from './catalog';
import { PurchaseService } from './PurchaseService';
import { entitlementFromStoreKit, productInfoFromStoreKit, StoreKitOwnedItem, StoreKitProductSnapshot } from './storeKitMapping';
import { t } from '@/i18n';

const SUBSCRIPTION_IDS = PRO_CATALOG.filter((item) => item.kind === 'subs').map((item) => item.appleProductId);
const LIFETIME_ID = catalogItemForPlan('lifetime').appleProductId;

function asSnapshot(product: ProductOrSubscription): StoreKitProductSnapshot {
  return product as StoreKitProductSnapshot;
}

function productIdsOf(purchase: Purchase): string[] {
  const ids = (purchase.ids ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (ids.length > 0) return ids;
  return purchase.productId ? [purchase.productId] : [];
}

type StorePurchaseError = {
  code?: ErrorCode;
  message?: string;
};

function resultFromError(error: StorePurchaseError, planId: PlanId): PurchaseResult {
  if (error.code === ErrorCode.UserCancelled) return { outcome: 'cancelled' };
  if (error.code === ErrorCode.Pending || error.code === ErrorCode.DeferredPayment) {
    return { outcome: 'pending', planId };
  }
  if (error.code === ErrorCode.AlreadyOwned) return { outcome: 'success', planId };
  return { outcome: 'error', message: error.message || t('purchases.couldNotComplete') };
}

function ownedItem(purchase: Purchase, productId: string, active?: ActiveSubscription): StoreKitOwnedItem {
  const renewal = active?.renewalInfoIOS;
  const purchaseExpiry = 'expirationDateIOS' in purchase ? purchase.expirationDateIOS : null;
  const expiresAt = purchaseExpiry ?? renewal?.renewalDate ?? null;
  return {
    productId,
    purchaseState: purchase.purchaseState === 'pending' || purchase.purchaseState === 'purchased' ? purchase.purchaseState : 'unknown',
    expiresAt,
    autoRenewing: purchase.isAutoRenewing === true || renewal?.willAutoRenew === true,
    inBillingRetry: renewal?.isInBillingRetry === true,
  };
}

/**
 * App Store adapter. Android uses Play Billing; web and Expo Go keep the mock
 * store because they have no StoreKit connection.
 */
export class StoreKitPurchaseService implements PurchaseService {
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
      fetchProducts({ skus: SUBSCRIPTION_IDS, type: 'subs' }),
      fetchProducts({ skus: [LIFETIME_ID], type: 'in-app' }),
    ]);
    const listed = [...(subscriptions ?? []), ...(inApp ?? [])];
    this.products = new Map(listed.map((product) => [product.id, product]));

    const infos = PRO_CATALOG.flatMap((item) => {
      const product = this.products.get(item.appleProductId);
      if (!product) return [];
      return [productInfoFromStoreKit(item, asSnapshot(product))];
    });
    if (infos.length === 0) {
      throw new Error(t('purchases.appStoreNoProducts'));
    }
    return infos;
  }

  async purchase(planId: PlanId): Promise<PurchaseResult> {
    await this.initialize();
    if (this.products.size === 0) {
      await this.getProducts();
    }
    const item = catalogItemForPlan(planId);
    if (!this.products.has(item.appleProductId)) {
      return { outcome: 'error', message: t('purchases.planUnavailableAppStore') };
    }

    return new Promise<PurchaseResult>((resolve) => {
      this.waiters.set(planId, resolve);
      requestPurchase({
        request: { apple: { sku: item.appleProductId } },
        type: item.kind,
      }).catch((error: unknown) => {
        this.waiters.delete(planId);
        const message = error instanceof Error ? error.message : t('purchases.couldNotComplete');
        resolve({ outcome: 'error', message });
      });
    });
  }

  async restorePurchases(): Promise<RestoreResult> {
    await this.initialize();
    await syncStorePurchases();
    const entitlement = await this.getEntitlement();
    if (entitlement.status !== 'pro' || !entitlement.planId) {
      return { outcome: 'nothing_to_restore' };
    }
    return { outcome: 'restored', planId: entitlement.planId };
  }

  async getEntitlement(): Promise<Entitlement> {
    await this.initialize();
    const [purchases, activeSubscriptions] = await Promise.all([
      getAvailablePurchases({ onlyIncludeActiveItemsIOS: true }),
      getActiveSubscriptions(SUBSCRIPTION_IDS).catch(() => [] as ActiveSubscription[]),
    ]);
    const activeByProduct = new Map(activeSubscriptions.map((subscription) => [subscription.productId, subscription]));

    const items: StoreKitOwnedItem[] = [];
    for (const purchase of purchases) {
      if (purchase.purchaseState === 'purchased') {
        await finishTransaction({ purchase, isConsumable: false }).catch((error: unknown) => {
          logger.warn('Failed to finish an App Store transaction', { error: String(error) });
        });
      }
      for (const productId of productIdsOf(purchase)) {
        if (!isAppleProduct(productId)) continue;
        items.push(ownedItem(purchase, productId, activeByProduct.get(productId)));
      }
    }
    return entitlementFromStoreKit(items);
  }

  private async handlePurchaseUpdate(purchase: Purchase): Promise<void> {
    const planId = this.planIdForPurchase(purchase);
    if (!planId) return;

    if (purchase.purchaseState === 'pending') {
      this.settle(planId, { outcome: 'pending', planId });
      return;
    }
    try {
      await finishTransaction({ purchase, isConsumable: false });
      this.settle(planId, { outcome: 'success', planId });
    } catch (error) {
      logger.warn('Failed to finish App Store transaction', { error: String(error) });
      this.settle(planId, { outcome: 'error', message: t('purchases.couldNotConfirmAppStore') });
    }
  }

  private handlePurchaseError(error: StorePurchaseError): void {
    const planId = this.pendingPlanId();
    if (!planId) return;
    this.settle(planId, resultFromError(error, planId));
  }

  private planIdForPurchase(purchase: Purchase): PlanId | undefined {
    for (const productId of productIdsOf(purchase)) {
      const match = catalogItemForApple(productId);
      if (match) return match.planId;
    }
    return this.pendingPlanId();
  }

  private pendingPlanId(): PlanId | undefined {
    if (this.waiters.size !== 1) return undefined;
    return this.waiters.keys().next().value;
  }

  private settle(planId: PlanId, result: PurchaseResult): void {
    const resolve = this.waiters.get(planId);
    if (!resolve) return;
    this.waiters.delete(planId);
    resolve(result);
  }
}

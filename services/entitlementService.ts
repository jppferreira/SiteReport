import AsyncStorage from '@react-native-async-storage/async-storage';

import { reportsRepository } from '@/database';
import { countDistinctReportedJobs, isReportGenerationAllowed } from '@/features/entitlement/freeReportQuota';
import {
  Entitlement,
  FREE_ENTITLEMENT,
  FREE_REPORT_LIMIT,
  PlanId,
  ProductInfo,
  PurchaseResult,
  RestoreResult,
} from '@/models';
import { logger } from '@/utils/logger';
import { getSecureItem, setSecureItem } from '@/utils/secureStorage';

import { getPurchaseService } from './purchases';

const ENTITLEMENT_CACHE_KEY = 'sitereport.entitlement.cache';
const PRODUCTS_CACHE_KEY = 'sitereport.products.cache';
/** __DEV__ only — forces a plan so store sandbox/Play Console isn't required. */
const DEV_OVERRIDE_KEY = 'sitereport.entitlement.devOverride';

export type DevEntitlementOverride = PlanId | 'free';

type Listener = (entitlement: Entitlement) => void;
const listeners = new Set<Listener>();

let cached: Entitlement | null = null;
let cachedProducts: ProductInfo[] | null = null;

function entitlementFromDevOverride(override: DevEntitlementOverride): Entitlement {
  if (override === 'free') return { ...FREE_ENTITLEMENT, lastVerifiedAt: new Date().toISOString() };
  const expiresAt =
    override === 'lifetime'
      ? null
      : new Date(Date.now() + (override === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString();
  return {
    status: 'pro',
    planId: override,
    subscriptionState: 'active',
    expiresAt,
    isLifetime: override === 'lifetime',
    lastVerifiedAt: new Date().toISOString(),
  };
}

async function readDevOverride(): Promise<DevEntitlementOverride | null> {
  if (!__DEV__) return null;
  try {
    const raw = await getSecureItem(DEV_OVERRIDE_KEY);
    if (raw === 'free' || raw === 'monthly' || raw === 'annual' || raw === 'lifetime') return raw;
  } catch {
    // Ignore — fall through to the real store.
  }
  return null;
}

/** __DEV__ only. Pass `null` to clear and re-read the real store. */
export async function setDevEntitlementOverride(
  override: DevEntitlementOverride | null
): Promise<Entitlement> {
  if (!__DEV__) return refreshEntitlement();
  if (override == null) {
    await setSecureItem(DEV_OVERRIDE_KEY, '');
    return refreshEntitlement();
  }
  await setSecureItem(DEV_OVERRIDE_KEY, override);
  const entitlement = entitlementFromDevOverride(override);
  await writeCache(entitlement);
  return entitlement;
}

export async function getDevEntitlementOverride(): Promise<DevEntitlementOverride | null> {
  return readDevOverride();
}

async function readCache(): Promise<Entitlement> {
  if (cached) return cached;
  let result: Entitlement;
  try {
    const raw = await getSecureItem(ENTITLEMENT_CACHE_KEY);
    result = raw ? { ...FREE_ENTITLEMENT, ...JSON.parse(raw) } : FREE_ENTITLEMENT;
  } catch (error) {
    logger.warn('Failed to read entitlement cache, defaulting to free', { error: String(error) });
    result = FREE_ENTITLEMENT;
  }
  cached = result;
  return result;
}

async function writeCache(entitlement: Entitlement): Promise<void> {
  cached = entitlement;
  await setSecureItem(ENTITLEMENT_CACHE_KEY, JSON.stringify(entitlement));
  listeners.forEach((listener) => listener(entitlement));
}

/** Call on app start and when the app returns to the foreground. */
export async function refreshEntitlement(): Promise<Entitlement> {
  try {
    const override = await readDevOverride();
    if (override) {
      const entitlement = entitlementFromDevOverride(override);
      await writeCache(entitlement);
      return entitlement;
    }
    const store = getPurchaseService();
    await store.initialize();
    const fresh = await store.getEntitlement();
    await writeCache(fresh);
    return fresh;
  } catch (error) {
    logger.warn('Entitlement refresh failed, using last known value (offline-safe)', { error: String(error) });
    return readCache();
  }
}

export async function getEntitlement(): Promise<Entitlement> {
  return readCache();
}

/** Sync snapshot of the in-memory entitlement, if refresh/get already ran this session. */
export function getCachedEntitlementSync(): Entitlement | null {
  return cached;
}

export async function hasProAccess(): Promise<boolean> {
  const entitlement = await readCache();
  return entitlement.status === 'pro';
}

export function subscribeToEntitlement(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getProducts(): Promise<ProductInfo[]> {
  try {
    const store = getPurchaseService();
    await store.initialize();
    const products = await store.getProducts();
    cachedProducts = products;
    await AsyncStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products)).catch(() => undefined);
    return products;
  } catch (error) {
    logger.warn('Product lookup failed, using last known prices', { error: String(error) });
    if (cachedProducts && cachedProducts.length > 0) return cachedProducts;
    try {
      const raw = await AsyncStorage.getItem(PRODUCTS_CACHE_KEY);
      const parsed = raw ? (JSON.parse(raw) as ProductInfo[]) : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedProducts = parsed;
        return parsed;
      }
    } catch {
      // A missing price cache still leaves jobs, photos and reports usable.
    }
    throw error;
  }
}

function optimisticPro(planId: PlanId): Entitlement {
  return {
    status: 'pro',
    planId,
    subscriptionState: 'active',
    expiresAt: null,
    isLifetime: planId === 'lifetime',
    lastVerifiedAt: new Date().toISOString(),
  };
}

export async function purchase(planId: PlanId): Promise<PurchaseResult> {
  const store = getPurchaseService();
  const result = await store.purchase(planId);
  if (result.outcome === 'success') {
    const fresh = await store.getEntitlement();
    // StoreKit/Play can lag right after purchase — never wipe a successful buy to free.
    await writeCache(fresh.status === 'pro' ? fresh : optimisticPro(result.planId));
    if (fresh.status !== 'pro') {
      void refreshEntitlement().catch(() => undefined);
    }
  }
  return result;
}

export async function restorePurchases(): Promise<RestoreResult> {
  const store = getPurchaseService();
  const result = await store.restorePurchases();
  if (result.outcome === 'restored') {
    const fresh = await store.getEntitlement();
    await writeCache(fresh.status === 'pro' ? fresh : optimisticPro(result.planId));
  }
  return result;
}

/** Number of distinct jobs that have ever had a report generated while free. Regenerating an existing job's report never costs additional quota. */
export async function getFreeReportsUsed(): Promise<number> {
  const reports = await reportsRepository.listAllReports();
  return countDistinctReportedJobs(reports.map((r) => r.jobId));
}

export async function getFreeReportsRemaining(): Promise<number> {
  const used = await getFreeReportsUsed();
  return Math.max(0, FREE_REPORT_LIMIT - used);
}

/** Whether generating a report for `jobId` is allowed under the free plan (always true once Pro). */
export async function canGenerateReportForJob(jobId: string): Promise<boolean> {
  const [isPro, reports] = await Promise.all([hasProAccess(), reportsRepository.listAllReports()]);
  return isReportGenerationAllowed(jobId, reports.map((r) => r.jobId), isPro);
}

export { FREE_REPORT_LIMIT };

import { requireOptionalNativeModule } from 'expo';

import { MockPurchaseService } from './MockPurchaseService';
import { PurchaseService } from './PurchaseService';
import { StoreKitPurchaseService } from './StoreKitPurchaseService';

export type { PurchaseService } from './PurchaseService';

let instance: PurchaseService | null = null;

/**
 * A store build talks to StoreKit. Expo Go does not ship the ExpoIap native
 * module, so it uses the same mock store as web instead of failing every
 * entitlement refresh.
 */
export function getPurchaseService(): PurchaseService {
  if (!instance) {
    instance = requireOptionalNativeModule('ExpoIap') ? new StoreKitPurchaseService() : new MockPurchaseService();
  }
  return instance;
}

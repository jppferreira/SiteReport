import { requireOptionalNativeModule } from 'expo';

import { MockPurchaseService } from './MockPurchaseService';
import { PlayPurchaseService } from './PlayPurchaseService';
import { PurchaseService } from './PurchaseService';

export type { PurchaseService } from './PurchaseService';

let instance: PurchaseService | null = null;

/**
 * A Play-enabled build talks to Google Play Billing. Expo Go does not ship
 * the ExpoIap native module, so it uses the same mock store as iOS and web
 * instead of failing every entitlement refresh.
 */
export function getPurchaseService(): PurchaseService {
  if (!instance) {
    instance = requireOptionalNativeModule('ExpoIap') ? new PlayPurchaseService() : new MockPurchaseService();
  }
  return instance;
}

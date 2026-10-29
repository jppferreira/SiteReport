import { MockPurchaseService } from './MockPurchaseService';
import { PurchaseService } from './PurchaseService';

export type { PurchaseService } from './PurchaseService';

let instance: PurchaseService | null = null;

/**
 * Web and any platform without its own entry use the mock store. iOS and
 * Android resolve `index.ios.ts` and `index.android.ts` instead.
 */
export function getPurchaseService(): PurchaseService {
  if (!instance) {
    instance = new MockPurchaseService();
  }
  return instance;
}

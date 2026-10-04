import { MockPurchaseService } from './MockPurchaseService';
import { PurchaseService } from './PurchaseService';

export type { PurchaseService } from './PurchaseService';

let instance: PurchaseService | null = null;

/**
 * Returns the active purchase adapter. Centralised here so swapping to a
 * real store-backed implementation for production is a one-line change —
 * see README.md in this folder.
 */
export function getPurchaseService(): PurchaseService {
  if (!instance) {
    instance = new MockPurchaseService();
  }
  return instance;
}

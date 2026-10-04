import * as SecureStore from 'expo-secure-store';

import type { EntitlementState, EntitlementType } from '@/models/domain';
import { nowIso } from '@/utils/date';

const ENTITLEMENT_KEY = 'sitereport_entitlement_v1';

const defaultState = (): EntitlementState => ({
  hasProAccess: false,
  entitlementType: 'none',
  expiresAt: null,
  checkedAt: nowIso(),
});

export const entitlementService = {
  async getEntitlement(): Promise<EntitlementState> {
    const raw = await SecureStore.getItemAsync(ENTITLEMENT_KEY);
    if (!raw) {
      return defaultState();
    }

    try {
      const parsed = JSON.parse(raw) as EntitlementState;
      return {
        hasProAccess: Boolean(parsed.hasProAccess),
        entitlementType: parsed.entitlementType ?? 'none',
        expiresAt: parsed.expiresAt ?? null,
        checkedAt: parsed.checkedAt ?? nowIso(),
      };
    } catch {
      return defaultState();
    }
  },

  async setEntitlement(next: { hasProAccess: boolean; entitlementType: EntitlementType; expiresAt?: string | null }) {
    const state: EntitlementState = {
      hasProAccess: next.hasProAccess,
      entitlementType: next.entitlementType,
      expiresAt: next.expiresAt ?? null,
      checkedAt: nowIso(),
    };
    await SecureStore.setItemAsync(ENTITLEMENT_KEY, JSON.stringify(state));
    return state;
  },

  async clear() {
    await SecureStore.deleteItemAsync(ENTITLEMENT_KEY);
  },
};

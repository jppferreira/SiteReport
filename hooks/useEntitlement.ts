import { useCallback, useEffect, useState } from 'react';

import { Entitlement, FREE_ENTITLEMENT } from '@/models';
import {
  getCachedEntitlementSync,
  getEntitlement,
  refreshEntitlement,
  subscribeToEntitlement,
} from '@/services/entitlementService';

export function useEntitlement() {
  const seeded = getCachedEntitlementSync();
  const [entitlement, setEntitlement] = useState<Entitlement>(seeded ?? FREE_ENTITLEMENT);
  const [loading, setLoading] = useState(seeded == null);

  useEffect(() => {
    let mounted = true;
    getEntitlement()
      .then((value) => {
        if (mounted) {
          setEntitlement(value);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    refreshEntitlement()
      .then((value) => {
        if (mounted) {
          setEntitlement(value);
          setLoading(false);
        }
      })
      .catch(() => undefined);
    const unsubscribe = subscribeToEntitlement((value) => {
      if (mounted) {
        setEntitlement(value);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const isPro = entitlement.status === 'pro';

  const refresh = useCallback(async () => {
    const value = await refreshEntitlement();
    setEntitlement(value);
    setLoading(false);
    return value;
  }, []);

  return { entitlement, isPro, loading, refresh };
}

import { useCallback, useEffect, useState } from 'react';

import { Entitlement, FREE_ENTITLEMENT } from '@/models';
import { getEntitlement, refreshEntitlement, subscribeToEntitlement } from '@/services/entitlementService';

export function useEntitlement() {
  const [entitlement, setEntitlement] = useState<Entitlement>(FREE_ENTITLEMENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getEntitlement().then((value) => {
      if (mounted) {
        setEntitlement(value);
        setLoading(false);
      }
    });
    refreshEntitlement().then((value) => {
      if (mounted) setEntitlement(value);
    });
    const unsubscribe = subscribeToEntitlement((value) => {
      if (mounted) setEntitlement(value);
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
    return value;
  }, []);

  return { entitlement, isPro, loading, refresh };
}

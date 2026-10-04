import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { EntitlementState } from '@/models/domain';
import { databaseService } from '@/services/databaseService';
import { entitlementService } from '@/services/entitlementService';
import { fileService } from '@/services/fileService';
import { purchaseService } from '@/services/purchaseService';
import { settingsService, type AppPreferences } from '@/services/settingsService';

type AppStateContextValue = {
  ready: boolean;
  bootstrapError: string | null;
  preferences: AppPreferences;
  entitlement: EntitlementState;
  refreshPreferences: () => Promise<void>;
  refreshEntitlement: () => Promise<void>;
  finishOnboarding: () => Promise<void>;
};

const defaultPreferences: AppPreferences = {
  onboardingCompleted: false,
  defaultPhotoQuality: 'balanced',
  includeSignatureByDefault: true,
};

const defaultEntitlement: EntitlementState = {
  hasProAccess: false,
  entitlementType: 'none',
  expiresAt: null,
  checkedAt: new Date().toISOString(),
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<AppPreferences>(defaultPreferences);
  const [entitlement, setEntitlement] = useState<EntitlementState>(defaultEntitlement);

  const refreshPreferences = async () => {
    const next = await settingsService.getPreferences();
    setPreferences(next);
  };

  const refreshEntitlement = async () => {
    try {
      const refreshed = await purchaseService.refreshEntitlements();
      setEntitlement(refreshed);
      return;
    } catch {
      const cached = await entitlementService.getEntitlement();
      setEntitlement(cached);
    }
  };

  const finishOnboarding = async () => {
    await settingsService.completeOnboarding();
    await refreshPreferences();
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await databaseService.init();
        await fileService.init();
        await purchaseService.init();

        const [prefs, cachedEntitlement] = await Promise.all([settingsService.getPreferences(), entitlementService.getEntitlement()]);
        if (!mounted) return;
        setPreferences(prefs);
        setEntitlement(cachedEntitlement);

        await refreshEntitlement();
      } catch (error) {
        if (!mounted) return;
        setBootstrapError(error instanceof Error ? error.message : 'Failed to initialise the app');
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
      purchaseService.teardown().catch(() => undefined);
    };
  }, []);

  const value = useMemo(
    () => ({
      ready,
      bootstrapError,
      preferences,
      entitlement,
      refreshPreferences,
      refreshEntitlement,
      finishOnboarding,
    }),
    [ready, bootstrapError, preferences, entitlement]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }
  return context;
}

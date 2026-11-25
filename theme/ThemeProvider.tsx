import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';

import {
  type AppearancePreference,
  getPreferences,
  normalizeAppearancePreference,
  savePreferences,
} from '@/services/preferencesService';

import { colors, type ThemeColors, type ThemeScheme } from './colors';
import { radius } from './radius';
import { shadows as lightShadows } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';

type Theme = {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof lightShadows;
  typography: typeof typography;
  /** Resolved light/dark tokens currently on screen. */
  scheme: ThemeScheme;
  /** User choice: follow system, or force light / dark. */
  appearance: AppearancePreference;
  setAppearance: (next: AppearancePreference) => Promise<void>;
};

const ThemeContext = createContext<Theme | null>(null);

const darkShadows: typeof lightShadows = {
  ...lightShadows,
  subtle: {
    boxShadow: [{ offsetX: 0, offsetY: 1, blurRadius: 2, color: 'rgba(0, 0, 0, 0.35)' }],
    elevation: 0,
  },
  card: {
    boxShadow: [
      { offsetX: 0, offsetY: 1, blurRadius: 1, color: 'rgba(0, 0, 0, 0.4)' },
      { offsetX: 0, offsetY: 8, blurRadius: 20, spreadDistance: -8, color: 'rgba(0, 0, 0, 0.45)' },
    ],
    elevation: 0,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: Platform.OS === 'android' ? 0 : 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  overlay: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: Platform.OS === 'android' ? 0 : 0.55,
    shadowRadius: 28,
    elevation: 12,
  },
};

function resolveScheme(
  appearance: AppearancePreference,
  system: string | null | undefined
): ThemeScheme {
  if (appearance === 'light' || appearance === 'dark') return appearance;
  return system === 'dark' ? 'dark' : 'light';
}

/**
 * Resolves light/dark from the saved appearance preference (system / light /
 * forced dark) and the device color scheme. Components keep using `useTheme()`.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [appearance, setAppearanceState] = useState<AppearancePreference>('system');

  useEffect(() => {
    let cancelled = false;
    getPreferences()
      .then((prefs) => {
        if (!cancelled) setAppearanceState(normalizeAppearancePreference(prefs.appearance));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const setAppearance = useCallback(async (next: AppearancePreference) => {
    const normalized = normalizeAppearancePreference(next);
    setAppearanceState(normalized);
    await savePreferences({ appearance: normalized });
  }, []);

  const scheme = resolveScheme(appearance, systemScheme);

  const value = useMemo<Theme>(
    () => ({
      colors: colors[scheme],
      spacing,
      radius,
      shadows: scheme === 'dark' ? darkShadows : lightShadows,
      typography,
      scheme,
      appearance,
      setAppearance,
    }),
    [scheme, appearance, setAppearance]
  );

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors[scheme].background).catch(() => undefined);
  }, [scheme]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

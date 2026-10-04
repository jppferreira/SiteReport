import React, { createContext, useContext, useMemo } from 'react';

import { colors, ThemeColors } from './colors';
import { radius } from './radius';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';

type Theme = {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  typography: typeof typography;
  scheme: 'light';
};

const ThemeContext = createContext<Theme | null>(null);

/**
 * The app ships a light theme only at launch. The provider shape already
 * supports swapping `colors.light` for `colors.dark` once a dark palette is
 * designed, without any consuming component needing to change.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<Theme>(
    () => ({
      colors: colors.light,
      spacing,
      radius,
      shadows,
      typography,
      scheme: 'light',
    }),
    []
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

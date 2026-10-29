/**
 * Trade Report color tokens.
 *
 * The design system is light-first. Every token below is grouped by role
 * (not by raw hue) so the app can later grow a `dark` palette with the same
 * shape and swap at runtime without touching component code.
 */

export type ColorScheme = {
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  accent: string;
  accentPressed: string;
  accentSoft: string;
  accentOnAccent: string;

  ctaDark: string;
  ctaDarkPressed: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  destructive: string;
  destructiveSoft: string;
  destructivePressed: string;

  overlay: string;
  skeleton: string;
};

const light: ColorScheme = {
  background: '#F6FAF7',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSunken: '#F2F4F2',
  border: '#E6E8E6',
  borderStrong: '#D5D8D5',

  textPrimary: '#121412',
  textSecondary: '#5E6862',
  textTertiary: '#8E9791',
  textInverse: '#FFFFFF',

  accent: '#1FA84A',
  accentPressed: '#178A3C',
  accentSoft: '#E7F6EC',
  accentOnAccent: '#FFFFFF',

  ctaDark: '#101310',
  ctaDarkPressed: '#262B26',

  success: '#1F9D4C',
  successSoft: '#E7F8EC',
  warning: '#B9770E',
  warningSoft: '#FBF0DC',
  destructive: '#D13B3B',
  destructiveSoft: '#FBEAEA',
  destructivePressed: '#AF2E2E',

  overlay: 'rgba(16, 19, 16, 0.48)',
  skeleton: '#ECEEEC',
};

export const colors = { light };

export type ThemeColors = typeof light;

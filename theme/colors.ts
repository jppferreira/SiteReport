/**
 * Trade Report color tokens.
 *
 * The design system is light-first. Both palettes share the same role shape so
 * the ThemeProvider can swap at runtime without touching component code.
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
  accentBorder: string;
  accentText: string;

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

  // Document colors
  docTileIcon: string;
  docProBg: string;
  docProFg: string;
  docSolidLabel: string;
  docSentBlue: string;
  docSentBlueSoft: string;
  pipQuote: string;
  pipReport: string;
  pipInvoice: string;
  pipOffBg: string;
  pipOffFg: string;

  // Guided checklist
  inProgressBg: string;
  inProgressFg: string;
  inProgressBorder: string;

  // Branding
  brandingSwatchRing: string;

  // Checklist
  checklistTrack: string;

  // Avatar
  avatarBg: string;

  // Preview (documentation only)
  previewSegmentedBg: string;
  previewSectionsBg: string;
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
  accentBorder: '#BFE6CB',
  accentText: '#127A36',

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

  // Document colors
  docTileIcon: '#121412',
  docProBg: '#101310',
  docProFg: '#FFFFFF',
  docSolidLabel: '#FFFFFF',
  docSentBlue: '#2F6FDB',
  docSentBlueSoft: '#E8F0FC',
  pipQuote: '#2F6FBF',
  pipReport: '#178A3C',
  pipInvoice: '#6B4CA0',
  pipOffBg: '#F2F4F2',
  pipOffFg: '#8E9791',

  // Guided checklist
  inProgressBg: '#FFF4DB',
  inProgressFg: '#9A6A00',
  inProgressBorder: '#E8A317',

  // Branding
  brandingSwatchRing: '#101310',

  // Checklist
  checklistTrack: '#E3E7E4',

  // Avatar
  avatarBg: '#E3E7E4',

  // Preview (documentation only)
  previewSegmentedBg: '#EEF2EF',
  previewSectionsBg: '#FAFBFA',
};

/**
 * Dark palette uses neutral charcoal (not green-tinted). Cards sit just above
 * the page background. WCAG AA compliant with 4.5:1 for text, 3:1 for UI components.
 */
const dark: ColorScheme = {
  background: '#111111',
  backgroundElevated: '#181818',
  surface: '#1A1A1A',
  surfaceSunken: '#141414',
  border: '#2A2A2A',
  borderStrong: '#6B6B6B', // Updated for 3.27:1 contrast

  textPrimary: '#F2F2F2',
  textSecondary: '#A3A3A3',
  textTertiary: '#8F8F8F', // Updated for 5.38:1 contrast
  textInverse: '#111111', // Updated: dark text on light CTA

  accent: '#2DBF5A',
  accentPressed: '#26A84E',
  accentSoft: '#1A2E22',
  accentOnAccent: '#111111', // Updated: dark text on accent
  accentBorder: '#3E8F59', // 4.37:1 vs surface
  accentText: '#3DCF6A', // 8.56:1 vs surface

  ctaDark: '#F2F2F2', // Updated: light button in dark mode (15.55:1)
  ctaDarkPressed: '#D9D9D9', // Updated: 12.33:1 vs surface

  success: '#3DCF6A',
  successSoft: '#1A2E22',
  warning: '#E0A03A',
  warningSoft: '#2E2410',
  destructive: '#E85A5A',
  destructiveSoft: '#2E1515',
  destructivePressed: '#C44A4A',

  overlay: 'rgba(0, 0, 0, 0.62)',
  skeleton: '#2A2A2A',

  // Document colors
  docTileIcon: '#F2F2F2', // 12.86-13.5:1 on tiles
  docProBg: '#F2F2F2', // 15.55:1 vs surface
  docProFg: '#111111', // 16.87:1 on pro-bg
  docSolidLabel: '#111111', // 16.87:1
  docSentBlue: '#7FB0FF', // 6.54:1 on sent-blue-soft
  docSentBlueSoft: '#1B2A44', // background of the badge
  pipQuote: '#8DB8F5', // 7.07:1 vs surface
  pipReport: '#6FD38C', // 7.80:1
  pipInvoice: '#BBA3EB', // 6.87:1
  pipOffBg: '#262626', // decorative
  pipOffFg: '#8F8F8F', // 4.68:1 on pip-off-bg

  // Guided checklist
  inProgressBg: '#2E2410',
  inProgressFg: '#E0A03A', // 6.73:1 on bg
  inProgressBorder: '#E0A03A', // 7.67:1 vs surface

  // Branding
  brandingSwatchRing: '#8F8F8F', // 5.38:1 vs surface

  // Checklist
  checklistTrack: '#404040', // 1.68 vs surface (decorative)

  // Avatar
  avatarBg: '#2A2A2A', // 1.21 (decorative); initials text 12.82:1

  // Preview (documentation only)
  previewSegmentedBg: '#141414',
  previewSectionsBg: '#181818',
};

export const colors = { light, dark };

export type ThemeColors = ColorScheme;
export type ThemeScheme = keyof typeof colors;

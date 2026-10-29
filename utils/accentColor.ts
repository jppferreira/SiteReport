/** Preset accent swatches on the branding screen. Reports store the same `#RRGGBB` form. */
export const ACCENT_PRESETS = ['#1FA84A', '#0EA5E9', '#101310', '#F59E0B', '#EF4444', '#8B5CF6'] as const;

export const DEFAULT_ACCENT = ACCENT_PRESETS[0];

const ACCENT_HEX = /^#([0-9A-F]{6})$/;

/**
 * Canonical `#RRGGBB` accepted by the report HTML, or null.
 * A leading `#` is optional; surrounding space is ignored. Shorthand and 8-digit hex are rejected.
 */
export function parseAccentHex(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const canonical = withHash.toUpperCase();
  return ACCENT_HEX.test(canonical) ? canonical : null;
}

export function isPresetAccent(value: string): boolean {
  const parsed = parseAccentHex(value);
  return parsed != null && (ACCENT_PRESETS as readonly string[]).includes(parsed);
}

/** Error once a custom entry is finished or the field is left. Incomplete typing stays quiet. */
export function customAccentError(value: string, committed: boolean): string | null {
  const trimmed = value.trim();
  if (!trimmed || parseAccentHex(trimmed)) return null;
  const body = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (!committed && body.length < 6) return null;
  return 'Use a 6-digit hex colour, like #1FA84A.';
}

/** Checkmark ink so a light custom swatch stays readable. */
export function accentSwatchInk(hex: string): '#FFFFFF' | '#121412' {
  const parsed = parseAccentHex(hex);
  if (!parsed) return '#FFFFFF';
  const n = Number.parseInt(parsed.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.72 ? '#121412' : '#FFFFFF';
}

import { getLocales } from 'expo-localization';
import { I18n, type TranslateOptions } from 'i18n-js';

import de from './locales/de';
import enGB from './locales/en-GB';
import enUS, { type TranslationTree } from './locales/en-US';
import es from './locales/es';
import fr from './locales/fr';
import it from './locales/it';
import nl from './locales/nl';
import pl from './locales/pl';
import pt from './locales/pt';
import sv from './locales/sv';

/** Locales Trade Report ships with (device language → first match). */
export const SUPPORTED_LOCALES = [
  'en-US',
  'en-GB',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'nl',
  'pl',
  'sv',
] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<AppLocale, string> = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  pl: 'Polski',
  sv: 'Svenska',
};

const catalogs: Record<AppLocale, TranslationTree> = {
  'en-US': enUS,
  'en-GB': enGB,
  es,
  fr,
  de,
  it,
  pt,
  nl,
  pl,
  sv,
};

const i18n = new I18n(catalogs);
i18n.defaultLocale = 'en-US';
i18n.enableFallback = true;
i18n.locale = resolveDeviceLocale();

/** Map device tags like `pt-PT`, `en-US`, `es-ES` onto a shipped catalog. */
export function resolveDeviceLocale(tag?: string): AppLocale {
  const raw = (tag ?? getLocales()[0]?.languageTag ?? 'en-US').replace('_', '-');
  const lower = raw.toLowerCase();

  if (lower === 'en-gb' || lower.startsWith('en-gb')) return 'en-GB';
  if (lower.startsWith('en')) return 'en-US';

  const language = lower.split('-')[0] ?? 'en';
  const match = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === language);
  if (match) return match;

  return 'en-US';
}

export function getLocale(): AppLocale {
  return i18n.locale as AppLocale;
}

export function setLocale(locale: AppLocale): void {
  i18n.locale = locale;
}

export type TranslationKey = string;

export function t(key: TranslationKey, options?: TranslateOptions): string {
  return i18n.t(key, options);
}

export { i18n };

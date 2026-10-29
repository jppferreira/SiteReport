import AsyncStorage from '@react-native-async-storage/async-storage';

import { type AppLocale, SUPPORTED_LOCALES } from './index';

const STORAGE_KEY = 'tradesreport.locale';

function isAppLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export async function loadStoredLocale(): Promise<AppLocale | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw || !isAppLocale(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export async function saveStoredLocale(locale: AppLocale): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, locale);
}

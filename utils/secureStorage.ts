import { Platform } from 'react-native';

import { logger } from '@/utils/logger';

/**
 * `expo-secure-store` has no web implementation (it throws "not a function"
 * for every method there). Native builds get the real Keychain/Keystore
 * backing; the web preview — which has no equivalent secure storage and is
 * only used for development/demo purposes — falls back to `localStorage` so
 * the same entitlement/purchase-state code paths work in both places.
 */
export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch (error) {
      logger.warn('Web storage read failed', { error: String(error) });
      return null;
    }
  }
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(key);
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch (error) {
      logger.warn('Web storage write failed', { error: String(error) });
    }
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch (error) {
      logger.warn('Web storage delete failed', { error: String(error) });
    }
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(key);
}

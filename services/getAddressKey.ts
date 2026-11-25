import { deleteSecureItem, getSecureItem, setSecureItem } from '@/utils/secureStorage';

const KEY = 'tradesreport.getAddressApiKey';

/** User-supplied getAddress.io API key (Settings). Env EXPO_PUBLIC_GETADDRESS_API_KEY also works. */
export async function getStoredGetAddressApiKey(): Promise<string | null> {
  const value = await getSecureItem(KEY);
  const trimmed = value?.trim();
  return trimmed || null;
}

export async function setStoredGetAddressApiKey(value: string | null): Promise<void> {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    await deleteSecureItem(KEY);
    return;
  }
  await setSecureItem(KEY, trimmed);
}

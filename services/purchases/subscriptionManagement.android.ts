import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo';

/** Opens the Google Play subscription management screen for this install. */
export async function openPlatformSubscriptionManagement(productId: string): Promise<boolean> {
  if (!requireOptionalNativeModule('ExpoIap')) return false;
  const packageName = Constants.expoConfig?.android?.package;
  if (!packageName) return false;
  const { deepLinkToSubscriptions } = await import('expo-iap');
  await deepLinkToSubscriptions({ skuAndroid: productId, packageNameAndroid: packageName });
  return true;
}

import { requireOptionalNativeModule } from 'expo';

/** Opens the App Store subscription management screen. */
export async function openPlatformSubscriptionManagement(_productId: string): Promise<boolean> {
  if (!requireOptionalNativeModule('ExpoIap')) return false;
  const { deepLinkToSubscriptions } = await import('expo-iap');
  await deepLinkToSubscriptions();
  return true;
}

import { router, type Href } from 'expo-router';

/**
 * Leaves the current screen. Prefers the real back stack; if this screen is
 * the start of the stack (deep link / Fast Refresh), opens the fallback so
 * Expo Router does not warn that GO_BACK was unhandled.
 */
export function goBack(fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}

/** iOS and web have no Play subscription screen. Callers fall back to the paywall. */
export async function openPlatformSubscriptionManagement(_productId: string): Promise<boolean> {
  return false;
}

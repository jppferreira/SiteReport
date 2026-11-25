/** Stripe Payment Links used on invoice PDFs for card payments. */
export function isStripePaymentLinkUrl(value: string): boolean {
  const trimmed = value.trim();
  return /^https:\/\/buy\.stripe\.com\//i.test(trimmed);
}

export function normalizeStripePaymentLink(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isStripePaymentLinkUrl(trimmed)) return null;
  return trimmed.slice(0, 500);
}
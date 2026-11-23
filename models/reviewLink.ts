export const REVIEW_PROVIDERS = ['google', 'checkatrade', 'custom'] as const;

export type ReviewProvider = (typeof REVIEW_PROVIDERS)[number];

export const REVIEW_PROVIDER_LABELS: Record<ReviewProvider, string> = {
  google: 'Google Reviews',
  checkatrade: 'Checkatrade',
  custom: 'Review link',
};

export function isReviewProvider(value: unknown): value is ReviewProvider {
  return typeof value === 'string' && (REVIEW_PROVIDERS as readonly string[]).includes(value);
}

export function normalizeReviewProvider(value: unknown): ReviewProvider {
  return isReviewProvider(value) ? value : 'google';
}

/** Short label for the PDF / preview when the full URL is long. */
export function displayReviewUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return trimmed
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
}

export function normalizeReviewUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, 300);
  return trimmed.length > 0 ? trimmed : null;
}

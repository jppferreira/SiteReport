import { normalizeDueDays } from './documentType';
import { normalizeReviewProvider, normalizeReviewUrl, ReviewProvider } from './reviewLink';
import { DEFAULT_REPORT_IMAGE_MASK, ReportImageMask } from './reportImageMask';

export type BusinessProfile = {
  businessName: string | null;
  logoUri: string | null;
  /** Photo used on the report cover when a job has no cover photo of its own. */
  coverImageUri: string | null;
  /** Photo used on the closing page. Falls back to the job cover, then the built-in scene. */
  thanksImageUri: string | null;
  /** Shared cut for the cover and thank-you photos. */
  imageMask: ReportImageMask;
  ownerName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  registrationNumber: string | null;
  vatNumber: string | null;
  accentColor: string | null;
  footerMessage: string | null;
  /** Google / Checkatrade / custom review page for the PDF review card. */
  reviewUrl: string | null;
  reviewProvider: ReviewProvider;
  /** Bank details shown on invoice PDFs. */
  bankName: string | null;
  sortCode: string | null;
  accountNumber: string | null;
  paymentTerms: string | null;
  /** Days after the job date before an invoice is due. */
  defaultDueDays: number;
  /** Next invoice sequence number (1-based). */
  nextInvoiceSequence: number;
  updatedAt: string;
};

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  businessName: null,
  logoUri: null,
  coverImageUri: null,
  thanksImageUri: null,
  imageMask: DEFAULT_REPORT_IMAGE_MASK,
  ownerName: null,
  email: null,
  phone: null,
  website: null,
  address: null,
  registrationNumber: null,
  vatNumber: null,
  accentColor: null,
  footerMessage: null,
  reviewUrl: null,
  reviewProvider: 'google',
  bankName: null,
  sortCode: null,
  accountNumber: null,
  paymentTerms: null,
  defaultDueDays: 14,
  nextInvoiceSequence: 1,
  updatedAt: new Date(0).toISOString(),
};

export function normalizeBankField(value: unknown, max = 80): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
}

export function coerceBusinessProfileFields(
  row: Partial<BusinessProfile> & Record<string, unknown>
): Pick<
  BusinessProfile,
  | 'reviewUrl'
  | 'reviewProvider'
  | 'bankName'
  | 'sortCode'
  | 'accountNumber'
  | 'paymentTerms'
  | 'defaultDueDays'
  | 'nextInvoiceSequence'
> {
  const seqRaw = row.nextInvoiceSequence;
  const seq =
    typeof seqRaw === 'number' && Number.isFinite(seqRaw)
      ? Math.max(1, Math.trunc(seqRaw))
      : typeof seqRaw === 'string' && Number.isFinite(Number(seqRaw))
        ? Math.max(1, Math.trunc(Number(seqRaw)))
        : 1;
  return {
    reviewUrl: normalizeReviewUrl(row.reviewUrl),
    reviewProvider: normalizeReviewProvider(row.reviewProvider),
    bankName: normalizeBankField(row.bankName, 120),
    sortCode: normalizeBankField(row.sortCode, 20),
    accountNumber: normalizeBankField(row.accountNumber, 40),
    paymentTerms: normalizeBankField(row.paymentTerms, 500),
    defaultDueDays: normalizeDueDays(row.defaultDueDays, 14),
    nextInvoiceSequence: seq,
  };
}

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
  updatedAt: new Date(0).toISOString(),
};

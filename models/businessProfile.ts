export type BusinessProfile = {
  businessName: string | null;
  logoUri: string | null;
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

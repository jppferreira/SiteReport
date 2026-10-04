export type JobStatus = 'draft' | 'complete';
export type PhotoType = 'before' | 'after';
export type SectionStatus = 'not_started' | 'in_progress' | 'complete';
export type ReportStatus = 'current' | 'stale';
export type BillingPlan = 'monthly' | 'annual' | 'lifetime';
export type EntitlementType = 'none' | 'subscription' | 'lifetime';

export interface Job {
  id: string;
  title: string;
  customerName: string | null;
  address: string | null;
  jobDate: string;
  referenceNumber: string | null;
  description: string | null;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  jobId: string;
  localUri: string;
  thumbnailUri: string | null;
  type: PhotoType;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface WorkSummary {
  jobId: string;
  workCompleted: string | null;
  materials: string | null;
  recommendations: string | null;
  notes: string | null;
}

export interface Signature {
  jobId: string;
  customerName: string | null;
  localSignatureUri: string;
  signedAt: string;
}

export interface BusinessProfile {
  businessName: string;
  logoUri: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  registrationNumber: string | null;
  vatNumber: string | null;
  accentColour: string;
  footerMessage: string | null;
}

export interface Report {
  id: string;
  jobId: string;
  localPdfUri: string;
  generatedAt: string;
  fileSize: number;
  version: number;
  status: ReportStatus;
}

export interface EntitlementState {
  hasProAccess: boolean;
  entitlementType: EntitlementType;
  expiresAt: string | null;
  checkedAt: string;
}

export interface PlanProduct {
  plan: BillingPlan;
  productId: string;
  title: string;
  description: string | null;
  displayPrice: string | null;
  isSubscription: boolean;
}

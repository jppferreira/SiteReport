import { CoverDesignId, JobStatus, ReportImageMask, ReportPricing, ReportTemplateId } from '@/models';

export type ReportPhotoData = {
  id: string;
  dataUri: string;
  caption: string | null;
  width: number;
  height: number;
  /** Camera time. Omitted when the photo has no capture metadata. */
  takenAt?: string | null;
};

/** Before and after photos for one named part of the job, such as Kitchen. */
export type ReportPhotoGroup = {
  name: string;
  before: ReportPhotoData[];
  after: ReportPhotoData[];
};

export type ReportHtmlInput = {
  business: {
    name: string;
    /** Person who prepares the report. Falls back to the business name on the cover. */
    ownerName?: string | null;
    logoDataUri: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
    registrationNumber: string | null;
    vatNumber: string | null;
    accentColor: string;
    footerMessage: string | null;
  };
  job: {
    title: string;
    referenceNumber: string | null;
    jobDate: string;
    customerName: string | null;
    address: string | null;
    description: string | null;
    status: JobStatus;
  };
  before: ReportPhotoData[];
  after: ReportPhotoData[];
  /** Photo the user saved as the cover for this job. Null when they have not chosen one. */
  coverDataUri?: string | null;
  /** Cover chosen in branding. Used when this job has no cover photo. */
  brandCoverDataUri?: string | null;
  /** Thank-you photo chosen in branding. Used ahead of the job cover photo. */
  brandThanksDataUri?: string | null;
  /** Shared cut for the cover and thank-you photos. */
  imageMask?: ReportImageMask;
  /** First-page design chosen in branding. */
  coverDesign?: CoverDesignId;
  /**
   * Named sections of the job. When present, each section prints its own
   * before and after photos. Omitted when the job has no sections in use.
   */
  areas?: ReportPhotoGroup[];
  workCompleted: string | null;
  materials: string | null;
  recommendations: string | null;
  /** Optional cost figures. Omitted from the document when off or empty. */
  pricing: ReportPricing | null;
  signature: {
    svgMarkup: string;
    customerName: string | null;
    signedAt: string;
  } | null;
  generatedAt: string;
  template: ReportTemplateId;
};

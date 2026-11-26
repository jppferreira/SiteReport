import {
  CommercialTemplateId,
  CoverDesignId,
  DocumentType,
  JobStatus,
  PhotoAnnotationLayout,
  PhotoAnnotations,
  ReportImageMask,
  ReportPricing,
  ReportSectionId,
  ReportSections,
  ReportTemplateId,
  ReviewProvider,
} from '@/models';

export type ReportPhotoData = {
  id: string;
  dataUri: string;
  caption: string | null;
  width: number;
  height: number;
  /** Camera time. Omitted when the photo has no capture metadata. */
  takenAt?: string | null;
  /** Markup drawn over the photo in the app. Printed on top of the image. */
  annotations?: PhotoAnnotations | null;
};

/** Before / during / after photos for one named part of the job, such as Kitchen. */
export type ReportPhotoGroup = {
  name: string;
  before: ReportPhotoData[];
  during: ReportPhotoData[];
  after: ReportPhotoData[];
};

export type ReportReviewLink = {
  url: string;
  provider: ReviewProvider;
};

export type ReportInvoiceDetails = {
  invoiceNumber: string;
  dueDate: string;
  dueDays: number;
  bankName: string | null;
  sortCode: string | null;
  accountNumber: string | null;
  paymentTerms: string | null;
  stripePaymentLink?: string | null;
};

/** Quote header fields for the commercial quote PDF (Figma Documents). */
export type ReportQuoteDetails = {
  quoteNumber: string;
  issuedAt: string;
  validUntil: string | null;
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
  during: ReportPhotoData[];
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
  /** Optional job checklist printed as a ticked list when includeInPdf is on. */
  checklist?: { label: string; checked: boolean }[] | null;
  /** Optional cost figures. Omitted from the document when off or empty. */
  pricing: ReportPricing | null;
  /** How pricing is titled. Defaults to reference. */
  documentType?: DocumentType;
  /** Present when documentType is invoice. */
  invoice?: ReportInvoiceDetails | null;
  /** Present when documentType is quote (commercial PDF). */
  quote?: ReportQuoteDetails | null;
  /** Review card on the last page when Pro and a URL are set. */
  review?: ReportReviewLink | null;
  signature: {
    svgMarkup: string;
    customerName: string | null;
    signedAt: string;
  } | null;
  generatedAt: string;
  template: ReportTemplateId;
  /** Quote / invoice layout. Ignored for job reports. */
  commercialTemplate?: CommercialTemplateId;
  /** Annotated photo cards: full-width stack, or before/after side by side. */
  photoAnnotationLayout?: PhotoAnnotationLayout;
  /** Which modular blocks print. Applied before HTML assembly. */
  reportSections?: ReportSections;
  /** Print order for modular blocks when the template supports reordering. */
  reportSectionOrder?: ReportSectionId[];
};

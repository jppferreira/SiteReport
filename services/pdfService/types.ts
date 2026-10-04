export type ReportPhotoData = {
  id: string;
  dataUri: string;
  caption: string | null;
  width: number;
  height: number;
};

export type ReportHtmlInput = {
  business: {
    name: string;
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
  };
  before: ReportPhotoData[];
  after: ReportPhotoData[];
  workCompleted: string | null;
  materials: string | null;
  recommendations: string | null;
  signature: {
    svgMarkup: string;
    customerName: string | null;
    signedAt: string;
  } | null;
  generatedAt: string;
};

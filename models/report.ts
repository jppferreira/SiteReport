export type Report = {
  id: string;
  jobId: string;
  localPdfUri: string;
  fileName: string;
  generatedAt: string;
  fileSize: number;
  version: number;
  /** Hash of the job content the report was generated from, used to detect staleness. */
  sourceHash: string;
};

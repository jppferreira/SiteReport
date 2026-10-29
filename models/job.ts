export type JobStatus = 'draft' | 'in_progress' | 'complete';

export type Job = {
  id: string;
  title: string;
  customerName: string | null;
  address: string | null;
  jobDate: string; // ISO date string (yyyy-MM-dd)
  referenceNumber: string | null;
  description: string | null;
  status: JobStatus;
  /** Photo the user saved as the cover for this job's reports. */
  coverPhotoId: string | null;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
};

export type JobDraft = {
  title: string;
  customerName?: string;
  address?: string;
  jobDate?: string;
  referenceNumber?: string;
  description?: string;
};

export type JobSectionKey = 'details' | 'photos' | 'summary' | 'signature' | 'report';

export type JobSectionStatus = 'not_started' | 'in_progress' | 'complete';

export type JobProgress = {
  sections: Record<JobSectionKey, JobSectionStatus>;
  completedCount: number;
  totalCount: number;
};

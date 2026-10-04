import type { Job, SectionStatus } from '@/models/domain';
import { databaseService } from '@/services/databaseService';
import { fileService } from '@/services/fileService';

export type JobSectionProgress = {
  details: SectionStatus;
  photos: SectionStatus;
  summary: SectionStatus;
  signature: SectionStatus;
  report: SectionStatus;
  completedSections: number;
  totalSections: number;
};

const toSectionStatus = (isStarted: boolean, isComplete: boolean): SectionStatus => {
  if (isComplete) return 'complete';
  if (isStarted) return 'in_progress';
  return 'not_started';
};

export const jobService = {
  async createJob(input: {
    title: string;
    customerName?: string | null;
    address?: string | null;
    jobDate?: string;
    referenceNumber?: string | null;
    description?: string | null;
  }) {
    if (!input.title.trim()) {
      throw new Error('Job title is required');
    }

    return databaseService.createJob(input);
  },

  async updateJob(jobId: string, updates: Partial<Job>) {
    const updated = await databaseService.updateJob(jobId, updates);
    await databaseService.markReportsStale(jobId);
    return updated;
  },

  async deleteJob(jobId: string) {
    const assets = await databaseService.deleteJob(jobId);
    await fileService.deleteMany([...assets.photoUris, ...assets.reportUris, assets.signatureUri].filter(Boolean) as string[]);
  },

  async deleteAllData() {
    const assets = await databaseService.deleteAllData();
    await fileService.deleteMany([...assets.photoUris, ...assets.signatureUris, ...assets.reportUris]);
  },

  async getProgress(jobId: string): Promise<JobSectionProgress> {
    const [job, photos, summary, signature, reports] = await Promise.all([
      databaseService.getJob(jobId),
      databaseService.getPhotos(jobId),
      databaseService.getWorkSummary(jobId),
      databaseService.getSignature(jobId),
      databaseService.listReportsByJob(jobId),
    ]);

    if (!job) {
      throw new Error('Job not found');
    }

    const beforePhotos = photos.filter((photo) => photo.type === 'before').length;
    const afterPhotos = photos.filter((photo) => photo.type === 'after').length;
    const detailsStarted = [job.customerName, job.address, job.description, job.referenceNumber].some(Boolean);
    const detailsComplete = job.title.trim().length > 0;

    const photosStarted = photos.length > 0;
    const photosComplete = beforePhotos > 0 && afterPhotos > 0;

    const summaryStarted = [summary?.workCompleted, summary?.materials, summary?.recommendations, summary?.notes].some(Boolean);
    const summaryComplete = Boolean(summary?.workCompleted && summary.workCompleted.trim().length > 0);

    const signatureStarted = Boolean(signature);
    const signatureComplete = Boolean(signature);

    const reportStarted = reports.length > 0;
    const reportComplete = reports.some((report) => report.status === 'current');

    const sections = {
      details: toSectionStatus(detailsStarted, detailsComplete),
      photos: toSectionStatus(photosStarted, photosComplete),
      summary: toSectionStatus(summaryStarted, summaryComplete),
      signature: toSectionStatus(signatureStarted, signatureComplete),
      report: toSectionStatus(reportStarted, reportComplete),
    };

    const completedSections = Object.values(sections).filter((value) => value === 'complete').length;
    return {
      ...sections,
      completedSections,
      totalSections: 5,
    };
  },
};

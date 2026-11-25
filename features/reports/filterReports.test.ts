import { ReportWithJob } from '@/hooks/useReports';
import { Job, Report } from '@/models';

import { selectReports } from './filterReports';

function report(overrides: Partial<Report> & Pick<Report, 'id' | 'jobId' | 'generatedAt' | 'status'>): Report {
  return {
    localPdfUri: 'file.pdf',
    fileName: 'Report.pdf',
    fileSize: 1,
    version: 1,
    sourceHash: 'hash',
    templateId: 'modern',
    ...overrides,
  };
}

function item(
  reportOverrides: Partial<Report> & Pick<Report, 'id' | 'jobId' | 'generatedAt' | 'status'>,
  jobOverrides?: Partial<Pick<Job, 'title' | 'customerName' | 'address'>>
): ReportWithJob {
  const next = report(reportOverrides);
  return {
    report: next,
    job: {
      id: next.jobId,
      title: jobOverrides?.title ?? 'Kitchen refit',
      customerName: jobOverrides?.customerName ?? 'Ada Lovelace',
      address: jobOverrides?.address ?? '14 Oak Street',
      jobDate: '2026-04-12',
      referenceNumber: null,
      description: null,
      status: 'complete',
      coverPhotoId: null,
      isQuick: false,
      customerId: null,
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
    },
    isStale: false,
    coverUri: null,
  };
}

describe('selectReports', () => {
  const items = [
    item({ id: 'new-active', jobId: 'job-1', generatedAt: '2026-05-02T00:00:00.000Z', status: 'active', fileName: 'Kitchen.pdf' }),
    item({ id: 'old-draft', jobId: 'job-1', generatedAt: '2026-04-01T00:00:00.000Z', status: 'draft', fileName: 'Kitchen draft.pdf' }),
    item(
      { id: 'archived', jobId: 'job-2', generatedAt: '2026-03-01T00:00:00.000Z', status: 'archived', fileName: 'Bathroom.pdf' },
      { title: 'Bathroom repair', customerName: 'Grace Hopper', address: '2 Pier Road' }
    ),
  ];

  it('keeps the newest report per job when no filter is set', () => {
    expect(selectReports(items, 'all', '').map((entry) => entry.report.id)).toEqual(['new-active', 'archived']);
  });

  it('filters by status and still keeps the newest match per job', () => {
    expect(selectReports(items, 'draft', '').map((entry) => entry.report.id)).toEqual(['old-draft']);
    expect(selectReports(items, 'archived', '').map((entry) => entry.report.id)).toEqual(['archived']);
    expect(selectReports(items, 'active', '').map((entry) => entry.report.id)).toEqual(['new-active']);
  });

  it('searches the file name, job title, customer, and address', () => {
    expect(selectReports(items, 'all', 'grace').map((entry) => entry.report.id)).toEqual(['archived']);
    expect(selectReports(items, 'all', 'PIER').map((entry) => entry.report.id)).toEqual(['archived']);
    expect(selectReports(items, 'all', 'kitchen.pdf').map((entry) => entry.report.id)).toEqual(['new-active']);
    expect(selectReports(items, 'active', 'bathroom')).toEqual([]);
  });
});

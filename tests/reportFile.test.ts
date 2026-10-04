import { describe, expect, it } from 'vitest';

import { buildReportFileName } from '@/features/reports/reportFile';
import type { Job } from '@/models/domain';

const baseJob: Job = {
  id: 'job-1',
  title: 'Bathroom Repair',
  customerName: 'James Wilson',
  address: null,
  jobDate: '2026-10-04T00:00:00.000Z',
  referenceNumber: null,
  description: null,
  status: 'draft',
  createdAt: '2026-10-04T00:00:00.000Z',
  updatedAt: '2026-10-04T00:00:00.000Z',
};

describe('buildReportFileName', () => {
  it('builds a deterministic filename', () => {
    expect(buildReportFileName(baseJob)).toBe('Bathroom-Repair-James-Wilson-2026-10-04');
  });
});

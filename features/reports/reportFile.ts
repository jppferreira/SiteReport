import type { Job } from '@/models/domain';
import { toFileDate } from '@/utils/date';
import { slugify } from '@/utils/file';

export const buildReportFileName = (job: Job) => {
  const datePart = toFileDate(job.jobDate);
  const title = slugify(job.title || 'Job');
  const customer = slugify(job.customerName || 'Customer');
  return `${title}-${customer}-${datePart}`;
};

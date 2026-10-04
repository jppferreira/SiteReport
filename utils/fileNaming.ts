/** Produces a filesystem-safe, PDF-friendly file name from job metadata. */
export function buildReportFileName(jobTitle: string, customerName: string | null, isoDate: string): string {
  const parts = [jobTitle, customerName ?? ''].filter(Boolean).join('-');
  const safe = sanitizeForFileName(parts);
  const datePart = isoDate.slice(0, 10);
  return `${safe}-${datePart}.pdf`;
}

export function sanitizeForFileName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'Job-Report';
}

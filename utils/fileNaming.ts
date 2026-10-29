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

export function reportFileExtension(fileName: string): 'pdf' | 'html' {
  return fileName.toLowerCase().endsWith('.html') ? 'html' : 'pdf';
}

/** The name shown in the rename field, without the file extension. */
export function reportFileStem(fileName: string): string {
  return fileName.replace(/\.(pdf|html)$/i, '');
}

/**
 * Turns a typed name into a shareable file name.
 * Keeps the report's existing extension so a web preview stays `.html` and a PDF stays `.pdf`.
 * Returns null when the name has no usable characters.
 */
export function normalizeReportFileName(value: string, extension: 'pdf' | 'html' = 'pdf'): string | null {
  let stem = value.trim().replace(/\.(pdf|html)$/i, '');
  stem = stem
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 80)
    .trim();
  if (!stem) return null;
  return `${stem}.${extension}`;
}

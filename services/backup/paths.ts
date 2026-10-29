/** Relative path inside the app's sitereport folder, safe to put in a zip. */
export function isSafeRelativePath(path: string): boolean {
  if (!path || path.length > 500) return false;
  if (path.startsWith('/') || path.startsWith('\\')) return false;
  if (path.includes('\\') || path.includes('\0')) return false;
  const parts = path.split('/');
  return parts.every((part) => part.length > 0 && part !== '.' && part !== '..');
}

/** Turns an app file URI into a portable path. Files outside sitereport are refused. */
export function toBackupPath(uri: string | null | undefined): string | null {
  if (!uri) return null;
  let decoded = uri;
  try {
    decoded = decodeURIComponent(uri);
  } catch {
    decoded = uri;
  }
  const marker = 'sitereport/';
  const index = decoded.lastIndexOf(marker);
  if (index < 0) return null;
  const relative = decoded.slice(index + marker.length).replace(/^\/+/, '');
  return isSafeRelativePath(relative) ? relative : null;
}

export function zipEntryName(relative: string): string {
  return `files/${relative}`;
}

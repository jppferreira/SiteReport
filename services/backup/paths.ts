import { fileUriReadCandidates } from '@/services/fileUri';

/** Relative path inside the app's sitereport folder, safe to put in a zip. */
export function isSafeRelativePath(path: string): boolean {
  if (!path || path.length > 500) return false;
  if (path.startsWith('/') || path.startsWith('\\')) return false;
  if (path.includes('\\') || path.includes('\0')) return false;
  const parts = path.split('/');
  return parts.every((part) => part.length > 0 && part !== '.' && part !== '..');
}

/**
 * Turns an app file URI into a portable path under sitereport/.
 * Expo Go encodes folder names with %25 / %2F, so the same file can look
 * like sitereport/, sitereport%2F, or sitereport%252F in the stored URI.
 */
export function toBackupPath(uri: string | null | undefined): string | null {
  if (!uri) return null;
  if (isSafeRelativePath(uri) && (uri.startsWith('jobs/') || uri.startsWith('business/') || uri.startsWith('recovered/'))) {
    return uri;
  }

  for (const candidate of backupPathCandidates(uri)) {
    const relative = relativeAfterSitereport(candidate);
    if (relative) return relative;
  }
  return null;
}

/**
 * When a job file was left outside sitereport (common for older Expo Go
 * print/cache URIs), still give it a stable zip path so backup can continue.
 */
export function orphanBackupPath(uri: string): string | null {
  const leaf = uri.split('/').pop()?.split('?')[0] ?? '';
  let name = leaf;
  try {
    name = decodeURIComponent(leaf);
  } catch {
    name = leaf;
  }
  name = name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
  if (!name || name === '.' || name === '..') name = 'file';
  const relative = `recovered/${shortToken(uri)}/${name}`;
  return isSafeRelativePath(relative) ? relative : null;
}

export function zipEntryName(relative: string): string {
  return `files/${relative}`;
}

function backupPathCandidates(uri: string): string[] {
  const out: string[] = [];
  for (const candidate of fileUriReadCandidates(uri)) {
    out.push(candidate, ...decodeLayers(candidate));
  }
  return [...new Set(out)];
}

function decodeLayers(value: string): string[] {
  const layers: string[] = [];
  let current = value;
  for (let step = 0; step < 4; step += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
      layers.push(current);
    } catch {
      break;
    }
  }
  return layers;
}

function relativeAfterSitereport(value: string): string | null {
  const markers = ['sitereport/', 'sitereport%2F', 'sitereport%2f'];
  let index = -1;
  let markerLength = 0;
  for (const marker of markers) {
    const at = value.toLowerCase().lastIndexOf(marker.toLowerCase());
    if (at > index) {
      index = at;
      markerLength = marker.length;
    }
  }
  if (index < 0) return null;
  const relative = value
    .slice(index + markerLength)
    .replace(/^\/+/, '')
    .replace(/%2F/gi, '/');
  let decoded = relative;
  try {
    decoded = decodeURIComponent(relative);
  } catch {
    decoded = relative;
  }
  return isSafeRelativePath(decoded) ? decoded : isSafeRelativePath(relative) ? relative : null;
}

function shortToken(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

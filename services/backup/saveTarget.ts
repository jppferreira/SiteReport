export type BackupTransport = 'web' | 'icloud' | 'google-drive' | 'picker';

/** Where a backup is written. iCloud is the iPhone path. Google Drive is the Android path. */
export function backupTransport(
  platform: string,
  destination: 'icloud' | 'google-drive' | 'manual'
): BackupTransport {
  if (platform === 'web') return 'web';
  if (platform === 'ios' && destination === 'icloud') return 'icloud';
  if (platform === 'android' && destination === 'google-drive') return 'google-drive';
  return 'picker';
}

export function fileNameFromPath(path: string, fallback: string): string {
  const name = path.split('/').pop()?.split('?')[0];
  if (!name) return fallback;
  try {
    const decoded = decodeURIComponent(name);
    if (decoded.endsWith('.zip') && !decoded.includes('/') && !decoded.includes('\\')) return decoded;
  } catch {
    if (name.endsWith('.zip')) return name;
  }
  return fallback;
}

const TECHNICAL = /exception|java\.|expo\.modules|undefined is not|cannot read propert/i;

/** Shows a sentence we wrote. Hides raw native errors behind the fallback. */
export function userFacingBackupError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (!message || TECHNICAL.test(message)) return fallback;
  return message;
}

export type DriveFailure = 'cancelled' | 'missing-app' | 'not-selected' | 'write-failed';

export function classifyDriveError(error: unknown): DriveFailure {
  const code = readCode(error);
  const text = `${code} ${error instanceof Error ? error.message : String(error)}`;
  if (code === 'ERR_DRIVE_APP_MISSING' || text.includes('ERR_DRIVE_APP_MISSING')) return 'missing-app';
  if (code === 'ERR_DRIVE_NOT_SELECTED' || text.includes('ERR_DRIVE_NOT_SELECTED')) return 'not-selected';
  if (text.toLowerCase().includes('cancel')) return 'cancelled';
  return 'write-failed';
}

function readCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

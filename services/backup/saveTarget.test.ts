import { backupTransport, classifyDriveError, fileNameFromPath, userFacingBackupError } from './saveTarget';

describe('backup destination', () => {
  it('sends iPhone iCloud backups to iCloud Drive and Android Google Drive backups to Drive', () => {
    expect(backupTransport('ios', 'icloud')).toBe('icloud');
    expect(backupTransport('android', 'google-drive')).toBe('google-drive');
    expect(backupTransport('ios', 'manual')).toBe('picker');
    expect(backupTransport('android', 'manual')).toBe('picker');
    expect(backupTransport('ios', 'google-drive')).toBe('picker');
    expect(backupTransport('web', 'google-drive')).toBe('web');
    expect(backupTransport('web', 'icloud')).toBe('web');
  });

  it('keeps the zip name that was written into the cache path', () => {
    expect(fileNameFromPath('file:///cache/tradesreport-backup-2026.zip', 'fallback.zip')).toBe(
      'tradesreport-backup-2026.zip'
    );
    expect(fileNameFromPath('file:///cache/tradesreport-backup-2026%20.zip', 'fallback.zip')).toBe(
      'tradesreport-backup-2026 .zip'
    );
    expect(fileNameFromPath('file:///cache/notes.txt', 'fallback.zip')).toBe('fallback.zip');
  });

  it('shows sentences we wrote and hides raw native errors', () => {
    expect(userFacingBackupError(new Error('Sign in to iCloud on this iPhone, then try again.'), 'fallback')).toBe(
      'Sign in to iCloud on this iPhone, then try again.'
    );
    expect(userFacingBackupError(new Error('java.lang.SecurityException: denied'), 'fallback')).toBe('fallback');
    expect(userFacingBackupError('nope', 'fallback')).toBe('fallback');
  });

  it('classifies Google Drive save failures', () => {
    expect(classifyDriveError({ code: 'ERR_DRIVE_APP_MISSING' })).toBe('missing-app');
    expect(classifyDriveError({ code: 'ERR_DRIVE_NOT_SELECTED', message: 'cancelled' })).toBe('not-selected');
    expect(classifyDriveError(new Error('The user cancelled the picker'))).toBe('cancelled');
    expect(classifyDriveError(new Error('disk full'))).toBe('write-failed');
  });
});

import { strToU8, unzipSync } from 'fflate';

import { packArchive, openBackup, type BackupManifest } from './archive';
import { decryptBackupZip, encryptBackupZip, isEncryptedBackup } from './backupCrypto';

const manifest: BackupManifest = {
  format: 'tradesreport-backup',
  formatVersion: 1,
  exportedAt: '2026-11-24T12:00:00.000Z',
  files: [],
  jobs: [],
  photos: [],
  areas: [],
  summaries: [],
  signatures: [],
  reports: [],
  checklists: [],
  events: [],
  businessProfile: null,
  documents: [],
  customers: [],
};

describe('backupCrypto', () => {
  it('round-trips encrypted backup bytes', async () => {
    const zip = packArchive(manifest, []);
    const encrypted = await encryptBackupZip(zip, 'test-password-123');
    expect(isEncryptedBackup(encrypted)).toBe(true);

    const plain = await decryptBackupZip(encrypted, 'test-password-123');
    expect(unzipSync(plain)['manifest.json']).toBeDefined();

    const opened = await openBackup(plain);
    expect(opened.ok).toBe(true);
  });

  it('rejects the wrong password', async () => {
    const zip = packArchive(manifest, []);
    const encrypted = await encryptBackupZip(zip, 'correct');
    await expect(decryptBackupZip(encrypted, 'wrong')).rejects.toBeTruthy();
  });

  it('leaves unencrypted zips identifiable', () => {
    const zip = packArchive(manifest, []);
    expect(isEncryptedBackup(zip)).toBe(false);
    expect(isEncryptedBackup(strToU8('TRBE1'))).toBe(true);
  });
});
import { packArchive, restoreIfValid, sha256Hex } from './archive';
import {
  ICLOUD_BACKUP_FILE_NAME,
  ICLOUD_BACKUP_INTERVAL_MS,
  runIcloudAutoBackup,
  shouldRunIcloudBackup,
  shouldShowIcloudTip,
  type IcloudBackupDeps,
} from './icloudAutoBackup';
import { clearAllPreferences, DEFAULT_PREFERENCES, getPreferences, savePreferences } from '../preferencesService';

const DAY = ICLOUD_BACKUP_INTERVAL_MS;

describe('iCloud auto-backup', () => {
  it('defaults the settings switch to on, and keeps a later off', async () => {
    await clearAllPreferences();
    expect(DEFAULT_PREFERENCES.icloudAutoBackup).toBe(true);
    expect((await getPreferences()).icloudAutoBackup).toBe(true);
    expect((await getPreferences()).icloudBackupTipSeen).toBe(false);

    await savePreferences({ icloudAutoBackup: false });
    expect((await getPreferences()).icloudAutoBackup).toBe(false);

    await savePreferences({ icloudAutoBackup: true });
    expect((await getPreferences()).icloudAutoBackup).toBe(true);
  });

  it('shows the iCloud Drive tip once, on iPhone, until it has been seen', () => {
    expect(shouldShowIcloudTip({ seen: false, platform: 'ios' })).toBe(true);
    expect(shouldShowIcloudTip({ seen: true, platform: 'ios' })).toBe(false);
    expect(shouldShowIcloudTip({ seen: false, platform: 'android' })).toBe(false);
    expect(shouldShowIcloudTip({ seen: false, platform: 'web' })).toBe(false);
  });

  it('runs after a report even when a backup was saved today, and on a daily schedule otherwise', () => {
    const recent = 1_000;
    expect(
      shouldRunIcloudBackup({
        enabled: true,
        platform: 'ios',
        reason: 'report',
        now: recent + 60_000,
        lastBackupAt: recent,
      })
    ).toBe(true);
    expect(
      shouldRunIcloudBackup({
        enabled: true,
        platform: 'ios',
        reason: 'schedule',
        now: recent + 60_000,
        lastBackupAt: recent,
      })
    ).toBe(false);
    expect(
      shouldRunIcloudBackup({
        enabled: true,
        platform: 'ios',
        reason: 'schedule',
        now: recent + DAY,
        lastBackupAt: recent,
      })
    ).toBe(true);
    expect(
      shouldRunIcloudBackup({
        enabled: false,
        platform: 'ios',
        reason: 'report',
        now: recent,
        lastBackupAt: null,
      })
    ).toBe(false);
    expect(
      shouldRunIcloudBackup({
        enabled: true,
        platform: 'web',
        reason: 'report',
        now: recent,
        lastBackupAt: null,
      })
    ).toBe(false);
  });

  it('writes the zip when the switch is on, and skips it when the switch is off', async () => {
    const saved = await runWith({ enabled: true, availability: 'ready', reason: 'report' });
    expect(saved.result).toBe('saved');
    expect(saved.fileName).toBe(ICLOUD_BACKUP_FILE_NAME);
    expect(saved.zipPath).toBe('file:///tmp/backup.zip');
    expect(saved.deleted).toBe('file:///tmp/backup.zip');
    expect(saved.lastBackupAt).toBe(new Date(5_000).toISOString());

    const skipped = await runWith({ enabled: false, availability: 'ready', reason: 'report' });
    expect(skipped.result).toBe('skipped');
    expect(skipped.fileName).toBeNull();
  });

  it('does not write a zip when iCloud is missing, and still reports that', async () => {
    const missing = await runWith({ enabled: true, availability: 'missing', reason: 'schedule' });
    expect(missing.result).toBe('unavailable');
    expect(missing.fileName).toBeNull();
    expect(missing.lastBackupAt).toBeNull();
  });

  it('packs jobs, photos, reports, and signatures into the zip that iCloud would store', async () => {
    const photo = new TextEncoder().encode('photo-bytes');
    const signature = new TextEncoder().encode('<svg></svg>');
    const report = new TextEncoder().encode('%PDF-report');
    const files = [
      { path: 'jobs/job-1/photos/full.jpg', data: photo },
      { path: 'jobs/job-1/signature.svg', data: signature },
      { path: 'jobs/job-1/reports/report.pdf', data: report },
    ];
    const listed = await Promise.all(
      files.map(async (file) => ({ path: file.path, bytes: file.data.byteLength, sha256: await sha256Hex(file.data) }))
    );
    const zip = packArchive(
      {
        format: 'tradesreport-backup',
        formatVersion: 1,
        exportedAt: '2026-10-26T12:00:00.000Z',
        files: listed,
        jobs: [
          {
            id: 'job-1',
            title: 'Bathroom repair',
            customerName: 'Sarah Thompson',
            address: '12 Oak Road',
            jobDate: '2026-10-04',
            referenceNumber: null,
            description: null,
            status: 'complete',
            coverPhotoId: null,
            createdAt: '2026-10-04T00:00:00.000Z',
            updatedAt: '2026-10-04T00:00:00.000Z',
          },
        ],
        photos: [
          {
            id: 'photo-1',
            jobId: 'job-1',
            areaId: null,
            localUri: 'jobs/job-1/photos/full.jpg',
            thumbnailUri: 'jobs/job-1/photos/full.jpg',
            type: 'after',
            caption: 'New tiles',
            sortOrder: 0,
            width: 800,
            height: 600,
            takenAt: null,
            createdAt: '2026-10-04T15:00:00.000Z',
          },
        ],
        areas: [],
        summaries: [],
        signatures: [
          {
            jobId: 'job-1',
            customerName: 'Sarah Thompson',
            localSignatureUri: 'jobs/job-1/signature.svg',
            width: 300,
            height: 120,
            signedAt: '2026-10-04T16:00:00.000Z',
          },
        ],
        reports: [
          {
            id: 'report-1',
            jobId: 'job-1',
            localPdfUri: 'jobs/job-1/reports/report.pdf',
            fileName: 'Bathroom repair.pdf',
            generatedAt: '2026-10-04T17:00:00.000Z',
            fileSize: report.byteLength,
            version: 1,
            sourceHash: 'hash',
            templateId: 'modern',
          },
        ],
        businessProfile: null,
      },
      files
    );

    const opened = await restoreIfValid(zip, async (backup) => {
      expect(backup.manifest.jobs.map((job) => job.title)).toEqual(['Bathroom repair']);
      expect(backup.files.get('jobs/job-1/photos/full.jpg')).toEqual(photo);
      expect(backup.files.get('jobs/job-1/reports/report.pdf')).toEqual(report);
      expect(backup.files.get('jobs/job-1/signature.svg')).toEqual(signature);
      expect(backup.manifest.reports[0]?.fileName).toBe('Bathroom repair.pdf');
      expect(backup.manifest.signatures[0]?.customerName).toBe('Sarah Thompson');
    });
    expect(opened.ok).toBe(true);
  });
});

async function runWith(input: {
  enabled: boolean;
  availability: 'ready' | 'signed-out' | 'missing';
  reason: 'schedule' | 'report';
}) {
  let fileName: string | null = null;
  let zipPath: string | null = null;
  let deleted: string | null = null;
  let lastBackupAt: string | null = null;
  const deps: IcloudBackupDeps = {
    getPreferences: async () => ({ icloudAutoBackup: input.enabled, lastIcloudBackupAt: null }),
    savePreferences: async (patch) => {
      lastBackupAt = patch.lastIcloudBackupAt ?? null;
    },
    platform: 'ios',
    now: () => 5_000,
    availability: () => input.availability,
    createBackupFile: async () => 'file:///tmp/backup.zip',
    saveZip: async (path, name) => {
      zipPath = path;
      fileName = name;
    },
    deleteFile: async (path) => {
      deleted = path;
    },
  };
  const result = await runIcloudAutoBackup(input.reason, deps);
  return { result, fileName, zipPath, deleted, lastBackupAt };
}

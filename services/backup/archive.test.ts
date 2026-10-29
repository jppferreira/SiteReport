import { strToU8, zipSync } from 'fflate';

import { packArchive, restoreIfValid, sha256Hex, BackupManifest } from './archive';

const photo = new TextEncoder().encode('photo-bytes');
const signature = new TextEncoder().encode('<svg></svg>');

async function manifest(): Promise<BackupManifest> {
  return {
    format: 'tradesreport-backup',
    formatVersion: 1,
    exportedAt: '2026-10-23T18:00:00.000Z',
    files: [
      { path: 'jobs/job-1/photos/full.jpg', bytes: photo.byteLength, sha256: await sha256Hex(photo) },
      { path: 'jobs/job-1/photos/thumb.jpg', bytes: photo.byteLength, sha256: await sha256Hex(photo) },
      { path: 'jobs/job-1/signature.svg', bytes: signature.byteLength, sha256: await sha256Hex(signature) },
    ],
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
        thumbnailUri: 'jobs/job-1/photos/thumb.jpg',
        type: 'after',
        caption: 'New tiles',
        sortOrder: 0,
        width: 800,
        height: 600,
        takenAt: '2026-10-04T14:30:00',
        createdAt: '2026-10-04T15:00:00.000Z',
      },
    ],
    areas: [],
    summaries: [
      {
        jobId: 'job-1',
        workCompleted: 'Fitted the shower',
        materials: null,
        recommendations: null,
        notes: 'Gate code 4821',
        pricing: { enabled: false, lines: [] },
        updatedAt: '2026-10-04T15:00:00.000Z',
      },
    ],
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
    reports: [],
    businessProfile: null,
  };
}

describe('openBackup', () => {
  it('round-trips photos, the signature, and private notes', async () => {
    const source = await manifest();
    const zip = packArchive(source, [
      { path: 'jobs/job-1/photos/full.jpg', data: photo },
      { path: 'jobs/job-1/photos/thumb.jpg', data: photo },
      { path: 'jobs/job-1/signature.svg', data: signature },
    ]);
    const opened = await restoreIfValid(zip, async (backup) => {
      expect(backup.files.get('jobs/job-1/photos/full.jpg')).toEqual(photo);
      expect(backup.manifest.summaries[0]?.notes).toBe('Gate code 4821');
      expect(backup.manifest.photos[0]?.takenAt).toBe('2026-10-04T14:30:00');
      expect(backup.manifest).not.toHaveProperty('entitlement');
    });
    expect(opened.ok).toBe(true);
  });

  it('does not commit when a file inside the zip was changed', async () => {
    const source = await manifest();
    const zip = packArchive(source, [
      { path: 'jobs/job-1/photos/full.jpg', data: photo },
      { path: 'jobs/job-1/photos/thumb.jpg', data: photo },
      { path: 'jobs/job-1/signature.svg', data: signature },
    ]);
    const tampered = new Uint8Array(zip);
    const marker = new TextEncoder().encode('photo-bytes');
    const start = findBytes(tampered, marker);
    expect(start).toBeGreaterThan(-1);
    tampered[start] = tampered[start] === 112 ? 113 : 112;

    const commit = jest.fn();
    const opened = await restoreIfValid(tampered, commit);
    expect(opened.ok).toBe(false);
    if (!opened.ok) expect(opened.liveDataChanged).toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });

  it('does not commit a zip that tries to escape the backup folder', async () => {
    const zip = zipSync({
      'manifest.json': strToU8('{}'),
      '../outside.jpg': photo,
    });
    const commit = jest.fn();
    const opened = await restoreIfValid(zip, commit);
    expect(opened.ok).toBe(false);
    if (!opened.ok) expect(opened.liveDataChanged).toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });
});

function findBytes(haystack: Uint8Array, needle: Uint8Array): number {
  for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    let matched = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[index + offset] !== needle[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return index;
  }
  return -1;
}

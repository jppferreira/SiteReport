import { strToU8, zipSync } from 'fflate';

import { openBackup, packArchive, restoreIfValid, sha256Hex, BackupManifest } from './archive';

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
        isQuick: false,
        customerId: null,
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
        annotations: null,
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
        documentType: 'reference',
        invoiceNumber: null,
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
    checklists: [],
    events: [],
    businessProfile: null,
    documents: [],
    customers: [],
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

  it('rejects backups written by a newer app format', async () => {
    const source = await manifest();
    const zip = packArchive({ ...source, formatVersion: 2 } as unknown as BackupManifest, [
      { path: 'jobs/job-1/photos/full.jpg', data: photo },
      { path: 'jobs/job-1/photos/thumb.jpg', data: photo },
      { path: 'jobs/job-1/signature.svg', data: signature },
    ]);
    const opened = await openBackup(zip);
    expect(opened.ok).toBe(false);
  });

  it('still opens the current backup format after app updates', async () => {
    const source = await manifest();
    const zip = packArchive(source, [
      { path: 'jobs/job-1/photos/full.jpg', data: photo },
      { path: 'jobs/job-1/photos/thumb.jpg', data: photo },
      { path: 'jobs/job-1/signature.svg', data: signature },
    ]);
    const opened = await openBackup(zip);
    expect(opened.ok).toBe(true);
  });

  it('round-trips quote documents and photo annotations through backup restore', async () => {
    const annotations = {
      version: 1 as const,
      shapes: [
        {
          kind: 'arrow' as const,
          color: '#FF5A36' as const,
          width: 0.009,
          from: { x: 0.2, y: 0.3 },
          to: { x: 0.7, y: 0.55 },
        },
        {
          kind: 'callout' as const,
          color: '#1FA84A' as const,
          at: { x: 0.4, y: 0.2 },
          note: 'Replace valve',
          anchor: { x: 0.45, y: 0.35 },
        },
        {
          kind: 'dimension' as const,
          color: '#FFB020' as const,
          width: 0.009,
          from: { x: 0.1, y: 0.8 },
          to: { x: 0.9, y: 0.8 },
          label: '2.4 m',
        },
      ],
    };
    const source = await manifest();
    const photo0 = source.photos[0];
    const job0 = source.jobs[0];
    if (!photo0 || !job0) throw new Error('expected seed photo and job');
    source.photos[0] = { ...photo0, annotations };
    source.customers = [
      {
        id: 'cust-1',
        name: 'Sarah Thompson',
        phone: '07700900123',
        email: 'sarah@example.com',
        address: '12 Oak Road',
        postcode: 'SW1A 1AA',
        createdAt: '2026-10-04T00:00:00.000Z',
        updatedAt: '2026-10-04T00:00:00.000Z',
      },
    ];
    source.jobs[0] = { ...job0, customerId: 'cust-1' };
    source.documents = [
      {
        id: 'doc-quote-1',
        jobId: 'job-1',
        kind: 'quote',
        number: 'QUO-1001',
        status: 'accepted',
        title: 'Bathroom quote',
        totalPence: 120000,
        netPence: 100000,
        vatPence: 20000,
        dueDate: null,
        validUntil: '2026-11-04',
        sentAt: '2026-10-05T10:00:00.000Z',
        paidAt: null,
        acceptedAt: '2026-10-06T12:00:00.000Z',
        declinedAt: null,
        paidMethod: null,
        paidAmountPence: null,
        sourceDocumentId: null,
        attachedReportId: null,
        pricingSnapshotJson: JSON.stringify({
          enabled: true,
          lines: [{ id: 'line-1', label: 'Labour', amountPence: 100000 }],
        }),
        reportId: null,
        localPdfUri: null,
        fileName: null,
        createdAt: '2026-10-04T16:00:00.000Z',
        updatedAt: '2026-10-06T12:00:00.000Z',
      },
    ];

    const zip = packArchive(source, [
      { path: 'jobs/job-1/photos/full.jpg', data: photo },
      { path: 'jobs/job-1/photos/thumb.jpg', data: photo },
      { path: 'jobs/job-1/signature.svg', data: signature },
    ]);

    const opened = await restoreIfValid(zip, async (backup) => {
      expect(backup.manifest.documents).toHaveLength(1);
      expect(backup.manifest.documents[0]).toMatchObject({
        kind: 'quote',
        number: 'QUO-1001',
        status: 'accepted',
        title: 'Bathroom quote',
        totalPence: 120000,
        pricingSnapshotJson: expect.stringContaining('Labour'),
      });
      expect(backup.manifest.customers[0]?.email).toBe('sarah@example.com');
      expect(backup.manifest.photos[0]?.annotations?.shapes).toHaveLength(3);
      expect(backup.manifest.photos[0]?.annotations?.shapes[1]).toMatchObject({
        kind: 'callout',
        note: 'Replace valve',
      });
      expect(backup.manifest.photos[0]?.annotations?.shapes[2]).toMatchObject({
        kind: 'dimension',
        label: '2.4 m',
      });
    });
    expect(opened.ok).toBe(true);
  });

  it('preserves legacy annotation colors when opening an older backup', async () => {
    const source = await manifest();
    const photo0 = source.photos[0];
    if (!photo0) throw new Error('expected seed photo');
    source.photos[0] = {
      ...photo0,
      annotations: {
        version: 1,
        shapes: [
          {
            kind: 'circle',
            color: '#FF3B30' as unknown as '#FF5A36',
            width: 0.009,
            from: { x: 0.2, y: 0.2 },
            to: { x: 0.4, y: 0.4 },
          },
        ],
      },
    };
    // Bypass typed annotations so the zip carries the legacy color string.
    (source.photos[0] as { annotations: unknown }).annotations = {
      version: 1,
      shapes: [
        {
          kind: 'circle',
          color: '#FF3B30',
          width: 0.009,
          from: { x: 0.2, y: 0.2 },
          to: { x: 0.4, y: 0.4 },
        },
      ],
    };

    const zip = packArchive(source, [
      { path: 'jobs/job-1/photos/full.jpg', data: photo },
      { path: 'jobs/job-1/photos/thumb.jpg', data: photo },
      { path: 'jobs/job-1/signature.svg', data: signature },
    ]);
    const opened = await openBackup(zip);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.backup.manifest.photos[0]?.annotations?.shapes[0]).toMatchObject({
      kind: 'circle',
      color: '#FF5A36',
    });
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

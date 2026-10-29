import { Job, Photo, WorkSummary } from '@/models';

import { computeJobContentHash, REPORT_RENDER_VERSION } from './contentHash';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: async (_algorithm: string, value: string) => value,
}));

function job(): Job {
  return {
    id: 'job-1',
    title: 'Boiler service',
    customerName: null,
    address: null,
    jobDate: '2026-10-04',
    referenceNumber: null,
    description: null,
    status: 'complete',
    coverPhotoId: null,
    createdAt: '2026-10-04T00:00:00.000Z',
    updatedAt: '2026-10-04T00:00:00.000Z',
  };
}

describe('computeJobContentHash', () => {
  it('keeps the same hash for the default cover design and a straight edge', async () => {
    const plain = await computeJobContentHash(job(), [], null, null);
    const defaults = await computeJobContentHash(job(), [], null, null, [], {
      coverDesign: 'editorial',
      imageMask: 'straight',
    });
    const asString = await computeJobContentHash(job(), [], null, null, [], 'file://cover.jpg');
    const asObject = await computeJobContentHash(job(), [], null, null, [], { coverUri: 'file://cover.jpg' });
    expect(defaults).toBe(plain);
    expect(asString).toBe(asObject);
    expect(asString).not.toBe(plain);
  });

  it('changes the hash when the cover design, mask, or thank-you image would change the PDF', async () => {
    const plain = await computeJobContentHash(job(), [], null, null);
    const design = await computeJobContentHash(job(), [], null, null, [], { coverDesign: 'bleed' });
    const mask = await computeJobContentHash(job(), [], null, null, [], { imageMask: 'wave' });
    const thanks = await computeJobContentHash(job(), [], null, null, [], { thanksUri: 'file://thanks.jpg' });
    expect(design).not.toBe(plain);
    expect(mask).not.toBe(plain);
    expect(thanks).not.toBe(plain);
  });

  it('marks existing reports outdated when the printed document changes', async () => {
    const hash = await computeJobContentHash(job(), [], null, null);
    expect(hash).toContain(`"renderVersion":${REPORT_RENDER_VERSION}`);
  });

  it('keeps private notes out of the hash and includes the capture time', async () => {
    const summary: WorkSummary = {
      jobId: 'job-1',
      workCompleted: 'Replaced the valve',
      materials: null,
      recommendations: null,
      notes: 'Gate code 4821 — do not print',
      pricing: { enabled: false, lines: [] },
      updatedAt: '2026-10-04T00:00:00.000Z',
    };
    const photo: Photo = {
      id: 'photo-1',
      jobId: 'job-1',
      areaId: null,
      localUri: 'file://photo.jpg',
      thumbnailUri: 'file://thumb.jpg',
      type: 'before',
      caption: 'Old valve',
      sortOrder: 0,
      width: 800,
      height: 600,
      takenAt: '2026-10-04T14:30:00',
      createdAt: '2026-10-23T18:00:00.000Z',
    };
    const withNotes = await computeJobContentHash(job(), [photo], summary, null);
    const withoutNotes = await computeJobContentHash(job(), [photo], { ...summary, notes: null }, null);
    expect(withNotes).toBe(withoutNotes);
    expect(withNotes).not.toContain('Gate code');
    expect(withNotes).toContain('2026-10-04T14:30:00');

    const savedLater = await computeJobContentHash(
      job(),
      [{ ...photo, takenAt: null, createdAt: '2026-10-23T19:00:00.000Z' }],
      summary,
      null
    );
    expect(savedLater).not.toContain('2026-10-23T19:00:00.000Z');
    expect(savedLater).not.toBe(withNotes);
  });
});

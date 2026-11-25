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
    isQuick: false,
    customerId: null,
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

  it('changes the hash when report section visibility or order changes', async () => {
    const plain = await computeJobContentHash(job(), [], null, null);
    const hiddenPhotos = await computeJobContentHash(job(), [], null, null, [], {
      reportSections: {
        cover: true,
        photos: false,
        checklist: true,
        costs: true,
        signature: true,
        review: true,
      },
    });
    const reordered = await computeJobContentHash(job(), [], null, null, [], {
      reportSectionOrder: ['review', 'cover', 'photos', 'checklist', 'costs', 'signature'],
    });
    expect(hiddenPhotos).not.toBe(plain);
    expect(reordered).not.toBe(plain);
  });

  it('changes the hash when checklist items or stamp prefs would change the PDF', async () => {
    const sections = {
      cover: true,
      photos: true,
      checklist: true,
      costs: true,
      signature: true,
      review: true,
    };
    const plain = await computeJobContentHash(job(), [], null, null, [], { reportSections: sections });
    const withChecklist = await computeJobContentHash(job(), [], null, null, [], {
      reportSections: sections,
      checklist: {
        includeInPdf: true,
        items: [{ label: 'Flue clear', checked: true }],
      },
    });
    const stampOff = await computeJobContentHash(job(), [], null, null, [], {
      reportSections: sections,
      stampShowOnPdf: false,
    });
    expect(withChecklist).not.toBe(plain);
    expect(stampOff).not.toBe(plain);
  });

  it('keeps private notes out of the hash and includes the capture time', async () => {
    const summary: WorkSummary = {
      jobId: 'job-1',
      workCompleted: 'Replaced the valve',
      materials: null,
      recommendations: null,
      notes: 'Gate code 4821 — do not print',
      pricing: { enabled: false, lines: [] },
      documentType: 'reference',
      invoiceNumber: null,
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
      annotations: null,
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

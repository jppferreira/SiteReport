import { describe, expect, it } from 'vitest';

import { reorderPhotoCollection } from '@/features/photos/photoOrder';
import type { Photo } from '@/models/domain';

const makePhoto = (id: string, sortOrder: number): Photo => ({
  id,
  jobId: 'job-1',
  localUri: `file://${id}.jpg`,
  thumbnailUri: null,
  type: 'before',
  caption: null,
  sortOrder,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('reorderPhotoCollection', () => {
  it('reorders by provided ids', () => {
    const photos = [makePhoto('a', 0), makePhoto('b', 1), makePhoto('c', 2)];
    const reordered = reorderPhotoCollection(photos, ['c', 'a', 'b']);
    expect(reordered.map((photo) => photo.id)).toEqual(['c', 'a', 'b']);
    expect(reordered.map((photo) => photo.sortOrder)).toEqual([0, 1, 2]);
  });
});

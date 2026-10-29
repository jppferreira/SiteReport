import { PhotoType } from '@/models';

import { ReportPhotoData, ReportPhotoGroup } from './types';

type TaggedPhoto = ReportPhotoData & {
  type: PhotoType;
  areaId: string | null;
  sortOrder: number;
};

type AreaRef = { id: string; name: string; sortOrder: number };

function asReportPhoto(photo: TaggedPhoto): ReportPhotoData {
  return {
    id: photo.id,
    dataUri: photo.dataUri,
    caption: photo.caption,
    width: photo.width,
    height: photo.height,
    takenAt: photo.takenAt,
  };
}

function byOrder(a: TaggedPhoto, b: TaggedPhoto): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.id.localeCompare(b.id);
}

/**
 * Groups photos under the job's named sections for the PDF.
 * Returns undefined when the job has no sections, or when every photo still
 * covers the whole job, so those reports keep the original before/after layout.
 */
export function groupReportPhotos(areas: AreaRef[], photos: TaggedPhoto[]): ReportPhotoGroup[] | undefined {
  if (areas.length === 0) return undefined;

  const areaIds = new Set(areas.map((area) => area.id));
  const belongs = (photo: TaggedPhoto) => photo.areaId != null && areaIds.has(photo.areaId);
  if (!photos.some(belongs)) return undefined;

  const ordered = [...areas].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const groups: ReportPhotoGroup[] = [];

  for (const area of ordered) {
    const inArea = photos.filter((photo) => photo.areaId === area.id).sort(byOrder);
    const before = inArea.filter((photo) => photo.type === 'before').map(asReportPhoto);
    const after = inArea.filter((photo) => photo.type === 'after').map(asReportPhoto);
    if (before.length === 0 && after.length === 0) continue;
    groups.push({ name: area.name, before, after });
  }

  const loose = photos.filter((photo) => !belongs(photo)).sort(byOrder);
  if (loose.length > 0) {
    groups.push({
      name: 'Other photos',
      before: loose.filter((photo) => photo.type === 'before').map(asReportPhoto),
      after: loose.filter((photo) => photo.type === 'after').map(asReportPhoto),
    });
  }

  return groups.length > 0 ? groups : undefined;
}

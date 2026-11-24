import type { PhotoAnnotations } from './photoAnnotation';

export type PhotoType = 'before' | 'during' | 'after';

export const PHOTO_TYPES: readonly PhotoType[] = ['before', 'during', 'after'] as const;

/** How the section photo list is shown: full-width cards, or a compact grid. */
export const PHOTO_BROWSE_LAYOUTS = ['fullWidth', 'compact'] as const;
export type PhotoBrowseLayout = (typeof PHOTO_BROWSE_LAYOUTS)[number];

export function normalizePhotoBrowseLayout(value: unknown): PhotoBrowseLayout {
  return value === 'compact' ? 'compact' : 'fullWidth';
}

export type Photo = {
  id: string;
  jobId: string;
  /** Named section this photo belongs to. Null covers the whole job. */
  areaId: string | null;
  localUri: string;
  thumbnailUri: string;
  type: PhotoType;
  caption: string | null;
  sortOrder: number;
  width: number;
  height: number;
  /** When the camera took the photo. Null when that time is unknown. */
  takenAt: string | null;
  /** Markup drawn over the photo. Null when nothing has been drawn. The file itself is never changed. */
  annotations: PhotoAnnotations | null;
  /** When this app saved the file. Not the shutter time. */
  createdAt: string;
};

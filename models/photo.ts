export type PhotoType = 'before' | 'after';

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
  /** When this app saved the file. Not the shutter time. */
  createdAt: string;
};

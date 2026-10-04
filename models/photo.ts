export type PhotoType = 'before' | 'after';

export type Photo = {
  id: string;
  jobId: string;
  localUri: string;
  thumbnailUri: string;
  type: PhotoType;
  caption: string | null;
  sortOrder: number;
  width: number;
  height: number;
  createdAt: string;
};

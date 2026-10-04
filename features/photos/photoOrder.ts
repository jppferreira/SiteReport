import type { Photo } from '@/models/domain';

export const reorderPhotoCollection = (photos: Photo[], orderedIds: string[]) => {
  const map = new Map(photos.map((photo) => [photo.id, photo]));
  return orderedIds
    .map((id, index) => {
      const photo = map.get(id);
      if (!photo) return null;
      return {
        ...photo,
        sortOrder: index,
      };
    })
    .filter((photo): photo is Photo => Boolean(photo));
};

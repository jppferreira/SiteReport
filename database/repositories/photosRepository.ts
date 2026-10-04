import { getDatabase } from '@/database/client';
import { Photo, PhotoType } from '@/models';
import { generateId } from '@/utils/id';

function rowToPhoto(row: Record<string, unknown>): Photo {
  return {
    id: row.id as string,
    jobId: row.jobId as string,
    localUri: row.localUri as string,
    thumbnailUri: row.thumbnailUri as string,
    type: row.type as PhotoType,
    caption: (row.caption as string | null) ?? null,
    sortOrder: row.sortOrder as number,
    width: row.width as number,
    height: row.height as number,
    createdAt: row.createdAt as string,
  };
}

export type NewPhoto = Omit<Photo, 'id' | 'createdAt' | 'sortOrder'> & { sortOrder?: number };

export async function addPhoto(photo: NewPhoto): Promise<Photo> {
  const db = await getDatabase();
  const existing = await listPhotos(photo.jobId, photo.type);
  const nextSortOrder = photo.sortOrder ?? existing.length;

  const record: Photo = {
    id: generateId(),
    jobId: photo.jobId,
    localUri: photo.localUri,
    thumbnailUri: photo.thumbnailUri,
    type: photo.type,
    caption: photo.caption ?? null,
    sortOrder: nextSortOrder,
    width: photo.width,
    height: photo.height,
    createdAt: new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO photos (id, jobId, localUri, thumbnailUri, type, caption, sortOrder, width, height, createdAt)
     VALUES ($id, $jobId, $localUri, $thumbnailUri, $type, $caption, $sortOrder, $width, $height, $createdAt)`,
    {
      $id: record.id,
      $jobId: record.jobId,
      $localUri: record.localUri,
      $thumbnailUri: record.thumbnailUri,
      $type: record.type,
      $caption: record.caption,
      $sortOrder: record.sortOrder,
      $width: record.width,
      $height: record.height,
      $createdAt: record.createdAt,
    }
  );

  return record;
}

export async function listPhotos(jobId: string, type?: PhotoType): Promise<Photo[]> {
  const db = await getDatabase();
  const rows = type
    ? await db.getAllAsync<Record<string, unknown>>(
        'SELECT * FROM photos WHERE jobId = ? AND type = ? ORDER BY sortOrder ASC',
        [jobId, type]
      )
    : await db.getAllAsync<Record<string, unknown>>(
        'SELECT * FROM photos WHERE jobId = ? ORDER BY sortOrder ASC',
        [jobId]
      );
  return rows.map(rowToPhoto);
}

export async function getPhoto(id: string): Promise<Photo | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM photos WHERE id = ?', [id]);
  return row ? rowToPhoto(row) : null;
}

export async function updatePhoto(
  id: string,
  patch: Partial<Pick<Photo, 'caption' | 'type' | 'sortOrder'>>
): Promise<void> {
  const db = await getDatabase();
  const existing = await getPhoto(id);
  if (!existing) return;

  const next = { ...existing, ...patch };
  await db.runAsync('UPDATE photos SET caption = $caption, type = $type, sortOrder = $sortOrder WHERE id = $id', {
    $id: id,
    $caption: next.caption,
    $type: next.type,
    $sortOrder: next.sortOrder,
  });
}

export async function reorderPhotos(jobId: string, type: PhotoType, orderedIds: string[]): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i += 1) {
      const photoId = orderedIds[i];
      if (!photoId) continue;
      await db.runAsync('UPDATE photos SET sortOrder = ? WHERE id = ? AND jobId = ? AND type = ?', [
        i,
        photoId,
        jobId,
        type,
      ]);
    }
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM photos WHERE id = ?', [id]);
}

export async function deletePhotosForJob(jobId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM photos WHERE jobId = ?', [jobId]);
}

export type JobPhotoSummary = { count: number; thumbnailUri: string | null };

export async function getJobPhotoSummaries(jobIds: string[]): Promise<Record<string, JobPhotoSummary>> {
  if (jobIds.length === 0) return {};
  const db = await getDatabase();
  const placeholders = jobIds.map(() => '?').join(',');

  const counts = await db.getAllAsync<{ jobId: string; count: number }>(
    `SELECT jobId, COUNT(*) as count FROM photos WHERE jobId IN (${placeholders}) GROUP BY jobId`,
    jobIds
  );
  const firstPhotos = await db.getAllAsync<{ jobId: string; thumbnailUri: string }>(
    `SELECT jobId, thumbnailUri FROM photos WHERE jobId IN (${placeholders}) AND sortOrder = (
       SELECT MIN(sortOrder) FROM photos p2 WHERE p2.jobId = photos.jobId
     )`,
    jobIds
  );

  const result: Record<string, JobPhotoSummary> = {};
  for (const jobId of jobIds) {
    result[jobId] = { count: 0, thumbnailUri: null };
  }
  for (const row of counts) {
    result[row.jobId] = { ...result[row.jobId], count: row.count } as JobPhotoSummary;
  }
  for (const row of firstPhotos) {
    if (result[row.jobId]) {
      result[row.jobId]!.thumbnailUri = row.thumbnailUri;
    }
  }
  return result;
}

export async function countPhotos(jobId: string): Promise<{ before: number; after: number }> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ type: PhotoType; count: number }>(
    'SELECT type, COUNT(*) as count FROM photos WHERE jobId = ? GROUP BY type',
    [jobId]
  );
  const result = { before: 0, after: 0 };
  for (const row of rows) {
    if (row.type === 'before') result.before = row.count;
    if (row.type === 'after') result.after = row.count;
  }
  return result;
}

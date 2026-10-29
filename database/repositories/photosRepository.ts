import { getDatabase } from '@/database/client';
import { Photo, PhotoType } from '@/models';
import { generateId } from '@/utils/id';

export function rowToPhoto(row: Record<string, unknown>): Photo {
  return {
    id: row.id as string,
    jobId: row.jobId as string,
    areaId: (row.areaId as string | null) ?? null,
    localUri: row.localUri as string,
    thumbnailUri: row.thumbnailUri as string,
    type: row.type as PhotoType,
    caption: (row.caption as string | null) ?? null,
    sortOrder: row.sortOrder as number,
    width: row.width as number,
    height: row.height as number,
    takenAt: (row.takenAt as string | null) ?? null,
    createdAt: row.createdAt as string,
  };
}

export type NewPhoto = Omit<Photo, 'id' | 'createdAt' | 'takenAt' | 'sortOrder' | 'areaId'> & {
  sortOrder?: number;
  areaId?: string | null;
  takenAt?: string | null;
};

export async function addPhoto(photo: NewPhoto): Promise<Photo> {
  const db = await getDatabase();
  const areaId = photo.areaId ?? null;
  const existing = await listPhotos(photo.jobId, photo.type, areaId);
  const nextSortOrder = photo.sortOrder ?? existing.length;

  const record: Photo = {
    id: generateId(),
    jobId: photo.jobId,
    areaId,
    localUri: photo.localUri,
    thumbnailUri: photo.thumbnailUri,
    type: photo.type,
    caption: photo.caption ?? null,
    sortOrder: nextSortOrder,
    width: photo.width,
    height: photo.height,
    takenAt: photo.takenAt ?? null,
    createdAt: new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO photos (id, jobId, areaId, localUri, thumbnailUri, type, caption, sortOrder, width, height, takenAt, createdAt)
     VALUES ($id, $jobId, $areaId, $localUri, $thumbnailUri, $type, $caption, $sortOrder, $width, $height, $takenAt, $createdAt)`,
    {
      $id: record.id,
      $jobId: record.jobId,
      $areaId: record.areaId,
      $localUri: record.localUri,
      $thumbnailUri: record.thumbnailUri,
      $type: record.type,
      $caption: record.caption,
      $sortOrder: record.sortOrder,
      $width: record.width,
      $height: record.height,
      $takenAt: record.takenAt,
      $createdAt: record.createdAt,
    }
  );

  return record;
}

/**
 * Lists photos for a job.
 * Omit `areaId` to include every section. Pass null for photos that cover the whole job.
 */
export async function listPhotos(jobId: string, type?: PhotoType, areaId?: string | null): Promise<Photo[]> {
  const db = await getDatabase();
  const clauses = ['jobId = ?'];
  const params: (string | number)[] = [jobId];
  if (type) {
    clauses.push('type = ?');
    params.push(type);
  }
  if (areaId !== undefined) {
    if (areaId === null) {
      clauses.push('areaId IS NULL');
    } else {
      clauses.push('areaId = ?');
      params.push(areaId);
    }
  }
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM photos WHERE ${clauses.join(' AND ')} ORDER BY sortOrder ASC`,
    params
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
  patch: Partial<Pick<Photo, 'caption' | 'type' | 'sortOrder' | 'areaId'>>
): Promise<void> {
  const db = await getDatabase();
  const existing = await getPhoto(id);
  if (!existing) return;

  const next = { ...existing, ...patch };
  const areaChanged = patch.areaId !== undefined && patch.areaId !== existing.areaId;
  if (areaChanged && patch.sortOrder === undefined) {
    const siblings = await listPhotos(existing.jobId, next.type, next.areaId);
    next.sortOrder = siblings.length;
  }

  await db.runAsync(
    'UPDATE photos SET caption = $caption, type = $type, sortOrder = $sortOrder, areaId = $areaId WHERE id = $id',
    {
      $id: id,
      $caption: next.caption,
      $type: next.type,
      $sortOrder: next.sortOrder,
      $areaId: next.areaId,
    }
  );
}

export async function reorderPhotos(
  jobId: string,
  type: PhotoType,
  orderedIds: string[],
  areaId: string | null = null
): Promise<void> {
  const db = await getDatabase();
  const areaSql = areaId === null ? 'areaId IS NULL' : 'areaId = ?';
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i += 1) {
      const photoId = orderedIds[i];
      if (!photoId) continue;
      const params = areaId === null ? [i, photoId, jobId, type] : [i, photoId, jobId, type, areaId];
      await db.runAsync(`UPDATE photos SET sortOrder = ? WHERE id = ? AND jobId = ? AND type = ? AND ${areaSql}`, params);
    }
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE jobs SET coverPhotoId = NULL WHERE coverPhotoId = ?', [id]);
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

  const covers = await db.getAllAsync<{ jobId: string; thumbnailUri: string }>(
    `SELECT j.id AS jobId, p.thumbnailUri
     FROM jobs j
     INNER JOIN photos p ON p.id = j.coverPhotoId
     WHERE j.id IN (${placeholders})`,
    jobIds
  );
  for (const row of covers) {
    if (result[row.jobId]) result[row.jobId]!.thumbnailUri = row.thumbnailUri;
  }
  return result;
}

/**
 * One photo per job for report covers. A photo the user saved as the cover
 * wins. Otherwise the first "after" photo, then the first photo of any kind.
 */
export async function getJobCoverUris(jobIds: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  for (const jobId of jobIds) result[jobId] = null;
  if (jobIds.length === 0) return result;

  const db = await getDatabase();
  const placeholders = jobIds.map(() => '?').join(',');
  const saved = await db.getAllAsync<{ jobId: string; localUri: string }>(
    `SELECT j.id AS jobId, p.localUri
     FROM jobs j
     INNER JOIN photos p ON p.id = j.coverPhotoId
     WHERE j.id IN (${placeholders})`,
    jobIds
  );
  for (const row of saved) result[row.jobId] = row.localUri;

  const rows = await db.getAllAsync<{ jobId: string; localUri: string }>(
    `SELECT jobId, localUri FROM (
       SELECT jobId, localUri,
              ROW_NUMBER() OVER (
                PARTITION BY jobId
                ORDER BY CASE WHEN type = 'after' THEN 0 ELSE 1 END, sortOrder ASC
              ) AS rn
       FROM photos
       WHERE jobId IN (${placeholders})
     ) WHERE rn = 1`,
    jobIds
  );
  for (const row of rows) {
    if (result[row.jobId] == null) result[row.jobId] = row.localUri;
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

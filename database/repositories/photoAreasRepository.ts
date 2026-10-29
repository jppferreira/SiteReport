import { getDatabase } from '@/database/client';
import { normalizeAreaName, Photo, PhotoArea } from '@/models';
import { generateId } from '@/utils/id';

import { listPhotos, rowToPhoto } from './photosRepository';

function rowToArea(row: Record<string, unknown>): PhotoArea {
  return {
    id: row.id as string,
    jobId: row.jobId as string,
    name: row.name as string,
    sortOrder: row.sortOrder as number,
    createdAt: row.createdAt as string,
  };
}

export async function listAreas(jobId: string): Promise<PhotoArea[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM photo_areas WHERE jobId = ? ORDER BY sortOrder ASC, createdAt ASC',
    [jobId]
  );
  return rows.map(rowToArea);
}

export async function getArea(id: string): Promise<PhotoArea | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM photo_areas WHERE id = ?', [id]);
  return row ? rowToArea(row) : null;
}

export async function countAreas(jobId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM photo_areas WHERE jobId = ?', [jobId]);
  return row?.count ?? 0;
}

export async function addArea(jobId: string, name: string): Promise<PhotoArea | null> {
  const cleaned = normalizeAreaName(name);
  if (!cleaned) return null;

  const db = await getDatabase();
  const existing = await listAreas(jobId);
  const record: PhotoArea = {
    id: generateId(),
    jobId,
    name: cleaned,
    sortOrder: existing.length,
    createdAt: new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO photo_areas (id, jobId, name, sortOrder, createdAt)
     VALUES ($id, $jobId, $name, $sortOrder, $createdAt)`,
    {
      $id: record.id,
      $jobId: record.jobId,
      $name: record.name,
      $sortOrder: record.sortOrder,
      $createdAt: record.createdAt,
    }
  );

  return record;
}

export async function renameArea(id: string, name: string): Promise<PhotoArea | null> {
  const cleaned = normalizeAreaName(name);
  if (!cleaned) return null;
  const db = await getDatabase();
  const existing = await getArea(id);
  if (!existing) return null;
  await db.runAsync('UPDATE photo_areas SET name = ? WHERE id = ?', [cleaned, id]);
  return { ...existing, name: cleaned };
}

/** Removes the section and its photo rows. The caller deletes the image files. */
export async function deleteArea(id: string): Promise<Photo[]> {
  const db = await getDatabase();
  const photos = await listPhotosForArea(id);
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM photos WHERE areaId = ?', [id]);
    await db.runAsync('DELETE FROM photo_areas WHERE id = ?', [id]);
  });
  return photos;
}

async function listPhotosForArea(areaId: string) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM photos WHERE areaId = ? ORDER BY sortOrder ASC', [areaId]);
  return rows.map(rowToPhoto);
}

/** Moves every photo that is not in a section into the given section. */
export async function claimUnassignedPhotos(jobId: string, areaId: string): Promise<void> {
  const db = await getDatabase();
  const existing = await listPhotos(jobId, undefined, areaId);
  const loose = await listPhotos(jobId, undefined, null);
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < loose.length; i += 1) {
      const photo = loose[i];
      if (!photo) continue;
      await db.runAsync('UPDATE photos SET areaId = ?, sortOrder = ? WHERE id = ? AND jobId = ?', [
        areaId,
        existing.length + i,
        photo.id,
        jobId,
      ]);
    }
  });
}

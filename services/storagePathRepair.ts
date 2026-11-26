import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { getDatabase } from '@/database/client';
import { resolveSitereportUri } from '@/services/backup/paths';
import { logger } from '@/utils/logger';

type UriRow = { id: string; localUri: string; thumbnailUri: string };

/**
 * After an iOS rebuild the app container UUID changes, but SQLite still holds
 * absolute file:// URIs under the old Documents path. Remap any sitereport
 * paths onto the current documentDirectory so photos/PDFs load again.
 */
export async function repairStaleSitereportUris(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const docs = FileSystem.documentDirectory;
  if (!docs) return 0;

  const db = await getDatabase();
  let updated = 0;

  const photos = await db.getAllAsync<UriRow>(`SELECT id, localUri, thumbnailUri FROM photos`);
  for (const photo of photos) {
    const localUri = resolveSitereportUri(photo.localUri, docs) ?? photo.localUri;
    const thumbnailUri = resolveSitereportUri(photo.thumbnailUri, docs) ?? photo.thumbnailUri;
    if (localUri === photo.localUri && thumbnailUri === photo.thumbnailUri) continue;
    await db.runAsync(`UPDATE photos SET localUri = ?, thumbnailUri = ? WHERE id = ?`, [
      localUri,
      thumbnailUri,
      photo.id,
    ]);
    updated += 1;
  }

  const signatures = await db.getAllAsync<{ jobId: string; localSignatureUri: string }>(
    `SELECT jobId, localSignatureUri FROM signatures`
  );
  for (const row of signatures) {
    const next = resolveSitereportUri(row.localSignatureUri, docs);
    if (!next || next === row.localSignatureUri) continue;
    await db.runAsync(`UPDATE signatures SET localSignatureUri = ? WHERE jobId = ?`, [next, row.jobId]);
    updated += 1;
  }

  const reports = await db.getAllAsync<{ id: string; localPdfUri: string }>(
    `SELECT id, localPdfUri FROM reports WHERE localPdfUri IS NOT NULL AND localPdfUri != ''`
  );
  for (const row of reports) {
    const next = resolveSitereportUri(row.localPdfUri, docs);
    if (!next || next === row.localPdfUri) continue;
    await db.runAsync(`UPDATE reports SET localPdfUri = ? WHERE id = ?`, [next, row.id]);
    updated += 1;
  }

  const documents = await db.getAllAsync<{ id: string; localPdfUri: string | null }>(
    `SELECT id, localPdfUri FROM documents WHERE localPdfUri IS NOT NULL AND localPdfUri != ''`
  );
  for (const row of documents) {
    if (!row.localPdfUri) continue;
    const next = resolveSitereportUri(row.localPdfUri, docs);
    if (!next || next === row.localPdfUri) continue;
    await db.runAsync(`UPDATE documents SET localPdfUri = ? WHERE id = ?`, [next, row.id]);
    updated += 1;
  }

  const profile = await db.getFirstAsync<{
    logoUri: string | null;
    coverImageUri: string | null;
    thanksImageUri: string | null;
  }>(`SELECT logoUri, coverImageUri, thanksImageUri FROM business_profile LIMIT 1`);
  if (profile) {
    const logoUri = resolveSitereportUri(profile.logoUri, docs);
    const coverImageUri = resolveSitereportUri(profile.coverImageUri, docs);
    const thanksImageUri = resolveSitereportUri(profile.thanksImageUri, docs);
    if (
      logoUri !== profile.logoUri ||
      coverImageUri !== profile.coverImageUri ||
      thanksImageUri !== profile.thanksImageUri
    ) {
      await db.runAsync(
        `UPDATE business_profile SET logoUri = ?, coverImageUri = ?, thanksImageUri = ?`,
        [logoUri, coverImageUri, thanksImageUri]
      );
      updated += 1;
    }
  }

  if (updated > 0) {
    logger.info('Repaired stale sitereport file URIs', { updated });
  }
  return updated;
}

import { Platform } from 'react-native';

import * as SQLite from 'expo-sqlite';

import { logger } from '@/utils/logger';

// Native builds (the app's actual targets) get a real persistent database
// file. The web preview uses expo-sqlite's in-memory WASM backend instead of
// its OPFS-backed persistent one: OPFS only allows a single open access
// handle per file, so a persistent database there breaks across hot reloads
// and multiple tabs. An in-memory database is a reasonable trade-off for a
// demo-only surface that resets on reload.
const DATABASE_NAME = Platform.OS === 'web' ? ':memory:' : 'sitereport.db';
const CURRENT_SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    return;
  }

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      customerName TEXT,
      address TEXT,
      jobDate TEXT NOT NULL,
      referenceNumber TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY NOT NULL,
      jobId TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      localUri TEXT NOT NULL,
      thumbnailUri TEXT NOT NULL,
      type TEXT NOT NULL,
      caption TEXT,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      width INTEGER NOT NULL DEFAULT 0,
      height INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_photos_jobId ON photos(jobId);

    CREATE TABLE IF NOT EXISTS work_summaries (
      jobId TEXT PRIMARY KEY NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      workCompleted TEXT,
      materials TEXT,
      recommendations TEXT,
      notes TEXT,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS signatures (
      jobId TEXT PRIMARY KEY NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      customerName TEXT,
      localSignatureUri TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      signedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY NOT NULL,
      jobId TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      localPdfUri TEXT NOT NULL,
      fileName TEXT NOT NULL,
      generatedAt TEXT NOT NULL,
      fileSize INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      sourceHash TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reports_jobId ON reports(jobId);

    CREATE TABLE IF NOT EXISTS business_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      businessName TEXT,
      logoUri TEXT,
      ownerName TEXT,
      email TEXT,
      phone TEXT,
      website TEXT,
      address TEXT,
      registrationNumber TEXT,
      vatNumber TEXT,
      accentColor TEXT,
      footerMessage TEXT,
      updatedAt TEXT NOT NULL
    );

    PRAGMA user_version = ${CURRENT_SCHEMA_VERSION};
  `);

  logger.debug('Database schema created', { version: CURRENT_SCHEMA_VERSION });
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

/** Test-only helper to force a fresh in-memory database. */
export function __resetDatabaseForTests() {
  dbPromise = null;
}

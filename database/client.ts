import { Platform } from 'react-native';

import * as SQLite from 'expo-sqlite';

import { logger } from '@/utils/logger';

import { orphanCleanupStatements } from './jobDelete';
import { readDatabaseSnapshot, writeDatabaseSnapshot } from './webSnapshot';

// Native builds keep a real database file on the device, so they work with
// no network. The web preview still uses an in-memory WASM database — OPFS
// holds an exclusive lock per origin and breaks hot reload — and copies that
// database into IndexedDB after each write so jobs survive reloads offline.
const DATABASE_NAME = Platform.OS === 'web' ? ':memory:' : 'sitereport.db';
const CURRENT_SCHEMA_VERSION = 9;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
let snapshotDb: SQLite.SQLiteDatabase | null = null;
let lifecycleInstalled = false;

async function enableForeignKeys(db: SQLite.SQLiteDatabase) {
  // SQLite leaves foreign keys off unless each connection turns them on.
  // The pragma is ignored inside a transaction, so it runs on its own.
  await db.execAsync('PRAGMA foreign_keys = ON');
}

async function migrate(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version >= CURRENT_SCHEMA_VERSION) {
    return;
  }

  if (version < 1) {
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
      coverImageUri TEXT,
      thanksImageUri TEXT,
      imageMask TEXT,
      updatedAt TEXT NOT NULL
    );

    PRAGMA user_version = 1;
  `);
    version = 1;
  }

  if (version < 2) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(reports)');
    if (!columns.some((column) => column.name === 'templateId')) {
      await db.execAsync(`ALTER TABLE reports ADD COLUMN templateId TEXT NOT NULL DEFAULT 'classic'`);
    }
    await db.execAsync('PRAGMA user_version = 2');
    version = 2;
  }

  if (version < 3) {
    const summaryColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(work_summaries)');
    if (!summaryColumns.some((column) => column.name === 'pricingJson')) {
      await db.execAsync('ALTER TABLE work_summaries ADD COLUMN pricingJson TEXT');
    }
    await db.execAsync('PRAGMA user_version = 3');
    version = 3;
  }

  if (version < 4) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS photo_areas (
        id TEXT PRIMARY KEY NOT NULL,
        jobId TEXT NOT NULL,
        name TEXT NOT NULL,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_photo_areas_jobId ON photo_areas(jobId);
    `);
    const photoColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(photos)');
    if (!photoColumns.some((column) => column.name === 'areaId')) {
      await db.execAsync('ALTER TABLE photos ADD COLUMN areaId TEXT');
    }
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_photos_areaId ON photos(areaId)');
    await db.execAsync('PRAGMA user_version = 4');
    version = 4;
  }

  if (version < 5) {
    const jobColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(jobs)');
    if (!jobColumns.some((column) => column.name === 'coverPhotoId')) {
      await db.execAsync('ALTER TABLE jobs ADD COLUMN coverPhotoId TEXT');
    }
    await db.execAsync('PRAGMA user_version = 5');
    version = 5;
  }

  if (version < 6) {
    for (const statement of orphanCleanupStatements()) {
      await db.execAsync(statement);
    }
    await db.execAsync('PRAGMA user_version = 6');
    version = 6;
  }

  if (version < 7) {
    const profileColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(business_profile)');
    if (!profileColumns.some((column) => column.name === 'coverImageUri')) {
      await db.execAsync('ALTER TABLE business_profile ADD COLUMN coverImageUri TEXT');
    }
    await db.execAsync('PRAGMA user_version = 7');
    version = 7;
  }

  if (version < 8) {
    const profileColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(business_profile)');
    if (!profileColumns.some((column) => column.name === 'thanksImageUri')) {
      await db.execAsync('ALTER TABLE business_profile ADD COLUMN thanksImageUri TEXT');
    }
    if (!profileColumns.some((column) => column.name === 'imageMask')) {
      await db.execAsync('ALTER TABLE business_profile ADD COLUMN imageMask TEXT');
    }
    await db.execAsync('PRAGMA user_version = 8');
    version = 8;
  }

  if (version < 9) {
    const photoColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(photos)');
    if (!photoColumns.some((column) => column.name === 'takenAt')) {
      await db.execAsync('ALTER TABLE photos ADD COLUMN takenAt TEXT');
    }
    await db.execAsync('PRAGMA user_version = 9');
  }

  logger.debug('Database schema ready', { version: CURRENT_SCHEMA_VERSION });
}

function queueWebSnapshot(db: SQLite.SQLiteDatabase) {
  if (Platform.OS !== 'web') return;
  snapshotDb = db;
  if (snapshotTimer) clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => {
    void flushWebDatabase();
  }, 200);
}

function trackWrites(db: SQLite.SQLiteDatabase): SQLite.SQLiteDatabase {
  if (Platform.OS !== 'web') return db;

  const run = db.runAsync.bind(db);
  const exec = db.execAsync.bind(db);
  const transaction = db.withTransactionAsync.bind(db);

  db.runAsync = (async (source: string, params?: SQLite.SQLiteBindParams) => {
    const result = params === undefined ? await run(source) : await run(source, params);
    queueWebSnapshot(db);
    return result;
  }) as typeof db.runAsync;

  db.execAsync = async (source: string) => {
    await exec(source);
    queueWebSnapshot(db);
  };

  db.withTransactionAsync = async (task: () => Promise<void>) => {
    await transaction(task);
    queueWebSnapshot(db);
  };

  return db;
}

function installSnapshotLifecycle() {
  if (lifecycleInstalled || Platform.OS !== 'web' || typeof window === 'undefined') return;
  lifecycleInstalled = true;
  const flush = () => {
    void flushWebDatabase();
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

/** Writes the web database to IndexedDB. No-op on native, where the file is already durable. */
export async function flushWebDatabase(): Promise<void> {
  if (Platform.OS !== 'web' || !snapshotDb) return;
  if (snapshotTimer) {
    clearTimeout(snapshotTimer);
    snapshotTimer = null;
  }
  try {
    const bytes = await snapshotDb.serializeAsync();
    await writeDatabaseSnapshot(bytes);
  } catch (error) {
    logger.warn('Failed to persist local database', { error: String(error) });
  }
}

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS !== 'web') {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await enableForeignKeys(db);
    await migrate(db);
    return db;
  }

  installSnapshotLifecycle();
  let db: SQLite.SQLiteDatabase;
  try {
    const snapshot = await readDatabaseSnapshot();
    db = snapshot && snapshot.byteLength > 0
      ? await SQLite.deserializeDatabaseAsync(snapshot)
      : await SQLite.openDatabaseAsync(DATABASE_NAME);
  } catch (error) {
    logger.warn('Saved database could not be restored, starting empty', { error: String(error) });
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  await enableForeignKeys(db);
  await migrate(db);
  const tracked = trackWrites(db);
  queueWebSnapshot(tracked);
  return tracked;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabase().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

/** Test-only helper to force a fresh in-memory database. */
export function __resetDatabaseForTests() {
  dbPromise = null;
  snapshotDb = null;
  if (snapshotTimer) {
    clearTimeout(snapshotTimer);
    snapshotTimer = null;
  }
}

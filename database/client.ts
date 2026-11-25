import { Platform } from 'react-native';

import type { SQLiteBindParams, SQLiteDatabase } from 'expo-sqlite';

import {
  formatInvoiceNumber,
  formatQuoteNumber,
  mapReportStatusToDocumentStatus,
  parsePricing,
  pricingVatBreakdown,
  VAT_RATE_PERCENT,
} from '@/models';
import { generateId } from '@/utils/id';
import { logger } from '@/utils/logger';

import { orphanCleanupStatements } from './jobDelete';
import { readDatabaseSnapshot, writeDatabaseSnapshot } from './webSnapshot';

// Native builds keep a real database file on the device, so they work with
// no network. The web preview still uses an in-memory WASM database — OPFS
// holds an exclusive lock per origin and breaks hot reload — and copies that
// database into IndexedDB after each write so jobs survive reloads offline.
const DATABASE_NAME = Platform.OS === 'web' ? ':memory:' : 'sitereport.db';
const CURRENT_SCHEMA_VERSION = 15;

type SQLiteModule = typeof import('expo-sqlite');

let sqliteModule: SQLiteModule | null = null;
let dbPromise: Promise<SQLiteDatabase> | null = null;
let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
let snapshotDb: SQLiteDatabase | null = null;
let lifecycleInstalled = false;

/**
 * Load expo-sqlite at call time, not import time. A top-level import throws
 * "Cannot find native module 'ExpoSQLite'" in Expo Go when the client SDK
 * doesn't match (SDK 58 Expo Go is still rolling out) and then every route
 * looks like a missing default export.
 */
async function loadSQLite(): Promise<SQLiteModule> {
  if (sqliteModule) return sqliteModule;
  try {
    sqliteModule = await import('expo-sqlite');
    return sqliteModule;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `ExpoSQLite is unavailable (${detail}). Open the Trade Report development build (npx expo run:ios / run:android), not Expo Go.`
    );
  }
}

async function enableForeignKeys(db: SQLiteDatabase) {
  // SQLite leaves foreign keys off unless each connection turns them on.
  // The pragma is ignored inside a transaction, so it runs on its own.
  await db.execAsync('PRAGMA foreign_keys = ON');
}

async function disableForeignKeys(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA foreign_keys = OFF');
}

/** Idempotent column/table repair so a half-failed migrate can recover. */
async function ensureDocumentsSchema(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY NOT NULL,
      jobId TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      number TEXT,
      status TEXT NOT NULL,
      title TEXT,
      totalPence INTEGER,
      netPence INTEGER,
      vatPence INTEGER,
      dueDate TEXT,
      validUntil TEXT,
      sentAt TEXT,
      paidAt TEXT,
      acceptedAt TEXT,
      declinedAt TEXT,
      paidMethod TEXT,
      paidAmountPence INTEGER,
      sourceDocumentId TEXT,
      attachedReportId TEXT,
      pricingSnapshotJson TEXT,
      reportId TEXT,
      localPdfUri TEXT,
      fileName TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_documents_jobId ON documents(jobId);
    CREATE INDEX IF NOT EXISTS idx_documents_kind ON documents(kind);
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_documents_number ON documents(number);

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      postcode TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_updatedAt ON customers(updatedAt);
  `);

  const jobColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(jobs)');
  if (!jobColumns.some((column) => column.name === 'isQuick')) {
    await db.execAsync(`ALTER TABLE jobs ADD COLUMN isQuick INTEGER NOT NULL DEFAULT 0`);
  }
  if (!jobColumns.some((column) => column.name === 'customerId')) {
    // No inline REFERENCES here — SQLite can't reliably add FK constraints via ALTER.
    await db.execAsync(`ALTER TABLE jobs ADD COLUMN customerId TEXT`);
  }
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_jobs_customerId ON jobs(customerId)');

  const profileColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(business_profile)');
  if (!profileColumns.some((column) => column.name === 'nextQuoteSequence')) {
    await db.execAsync(`ALTER TABLE business_profile ADD COLUMN nextQuoteSequence INTEGER NOT NULL DEFAULT 1`);
  }
  if (!profileColumns.some((column) => column.name === 'defaultQuoteValidityDays')) {
    await db.execAsync(`ALTER TABLE business_profile ADD COLUMN defaultQuoteValidityDays INTEGER NOT NULL DEFAULT 30`);
  }
  if (!profileColumns.some((column) => column.name === 'stripePaymentLink')) {
    await db.execAsync('ALTER TABLE business_profile ADD COLUMN stripePaymentLink TEXT');
  }
}

async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  // Always repair columns first — recovers DBs stuck after a failed v14/v15 migrate.
  await disableForeignKeys(db);
  try {
    await ensureDocumentsSchema(db);
  } finally {
    await enableForeignKeys(db);
  }

  if (version >= CURRENT_SCHEMA_VERSION) {
    logger.debug('Database schema ready', { version: CURRENT_SCHEMA_VERSION });
    return;
  }

  // Migrations that backfill rows must not trip on orphaned FKs.
  await disableForeignKeys(db);
  try {
    await runVersionedMigrations(db, version);
  } finally {
    await enableForeignKeys(db);
  }

  logger.debug('Database schema ready', { version: CURRENT_SCHEMA_VERSION });
}

async function runVersionedMigrations(db: SQLiteDatabase, startVersion: number) {
  let version = startVersion;

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
    version = 9;
  }

  if (version < 10) {
    const reportColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(reports)');
    if (!reportColumns.some((column) => column.name === 'status')) {
      await db.execAsync(`ALTER TABLE reports ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);
    }
    await db.execAsync('PRAGMA user_version = 10');
    version = 10;
  }

  if (version < 11) {
    const photoColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(photos)');
    if (!photoColumns.some((column) => column.name === 'annotations')) {
      await db.execAsync('ALTER TABLE photos ADD COLUMN annotations TEXT');
    }
    await db.execAsync('PRAGMA user_version = 11');
    version = 11;
  }

  if (version < 12) {
    const profileColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(business_profile)');
    const profileAdds: Array<[string, string]> = [
      ['reviewUrl', 'TEXT'],
      ['reviewProvider', "TEXT NOT NULL DEFAULT 'google'"],
      ['bankName', 'TEXT'],
      ['sortCode', 'TEXT'],
      ['accountNumber', 'TEXT'],
      ['paymentTerms', 'TEXT'],
      ['defaultDueDays', 'INTEGER NOT NULL DEFAULT 14'],
      ['nextInvoiceSequence', 'INTEGER NOT NULL DEFAULT 1'],
    ];
    for (const [name, type] of profileAdds) {
      if (!profileColumns.some((column) => column.name === name)) {
        await db.execAsync(`ALTER TABLE business_profile ADD COLUMN ${name} ${type}`);
      }
    }

    const summaryColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(work_summaries)');
    if (!summaryColumns.some((column) => column.name === 'documentType')) {
      await db.execAsync(`ALTER TABLE work_summaries ADD COLUMN documentType TEXT NOT NULL DEFAULT 'reference'`);
    }
    if (!summaryColumns.some((column) => column.name === 'invoiceNumber')) {
      await db.execAsync('ALTER TABLE work_summaries ADD COLUMN invoiceNumber TEXT');
    }
    await db.execAsync('PRAGMA user_version = 12');
    version = 12;
  }

  if (version < 13) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS job_checklists (
        jobId TEXT PRIMARY KEY NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        templateId TEXT NOT NULL,
        includeInPdf INTEGER NOT NULL DEFAULT 1,
        itemsJson TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS report_events (
        id TEXT PRIMARY KEY NOT NULL,
        reportId TEXT NOT NULL,
        jobId TEXT NOT NULL,
        kind TEXT NOT NULL,
        label TEXT NOT NULL,
        recipient TEXT,
        createdAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_report_events_jobId ON report_events(jobId);
      CREATE INDEX IF NOT EXISTS idx_report_events_reportId ON report_events(reportId);
    `);
    await db.execAsync('PRAGMA user_version = 13');
    version = 13;
  }

  if (version < 14) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY NOT NULL,
        jobId TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        number TEXT,
        status TEXT NOT NULL,
        title TEXT,
        totalPence INTEGER,
        netPence INTEGER,
        vatPence INTEGER,
        dueDate TEXT,
        validUntil TEXT,
        sentAt TEXT,
        paidAt TEXT,
        acceptedAt TEXT,
        declinedAt TEXT,
        paidMethod TEXT,
        paidAmountPence INTEGER,
        sourceDocumentId TEXT,
        attachedReportId TEXT,
        pricingSnapshotJson TEXT,
        reportId TEXT,
        localPdfUri TEXT,
        fileName TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_documents_jobId ON documents(jobId);
      CREATE INDEX IF NOT EXISTS idx_documents_kind ON documents(kind);
      CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
      CREATE INDEX IF NOT EXISTS idx_documents_number ON documents(number);
    `);

    const jobColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(jobs)');
    if (!jobColumns.some((column) => column.name === 'isQuick')) {
      await db.execAsync(`ALTER TABLE jobs ADD COLUMN isQuick INTEGER NOT NULL DEFAULT 0`);
    }

    const profileColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(business_profile)');
    if (!profileColumns.some((column) => column.name === 'nextQuoteSequence')) {
      await db.execAsync(`ALTER TABLE business_profile ADD COLUMN nextQuoteSequence INTEGER NOT NULL DEFAULT 1`);
    }
    if (!profileColumns.some((column) => column.name === 'defaultQuoteValidityDays')) {
      await db.execAsync(`ALTER TABLE business_profile ADD COLUMN defaultQuoteValidityDays INTEGER NOT NULL DEFAULT 30`);
    }

    const reportRows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM reports');
    const now = new Date().toISOString();
    for (const row of reportRows) {
      const reportId = row.id as string;
      const jobId = row.jobId as string;
      const jobExists = await db.getFirstAsync<{ id: string }>('SELECT id FROM jobs WHERE id = ?', jobId);
      if (!jobExists) continue;

      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM documents WHERE reportId = ?',
        reportId
      );
      if (existing) continue;

      const status = mapReportStatusToDocumentStatus(String(row.status ?? 'active'));
      const generatedAt = (row.generatedAt as string) ?? now;
      const createdAt = generatedAt;
      try {
        await db.runAsync(
          `INSERT INTO documents (
            id, jobId, kind, number, status, title,
            totalPence, netPence, vatPence,
            dueDate, validUntil, sentAt, paidAt, acceptedAt, declinedAt,
            paidMethod, paidAmountPence, sourceDocumentId, attachedReportId,
            pricingSnapshotJson, reportId, localPdfUri, fileName, createdAt, updatedAt
          ) VALUES (
            $id, $jobId, 'report', NULL, $status, $title,
            NULL, NULL, NULL,
            NULL, NULL, $sentAt, NULL, NULL, NULL,
            NULL, NULL, NULL, NULL,
            NULL, $reportId, $localPdfUri, $fileName, $createdAt, $updatedAt
          )`,
          {
            $id: generateId(),
            $jobId: jobId,
            $status: status,
            $title: (row.fileName as string) ?? null,
            $sentAt: status === 'sent' ? generatedAt : null,
            $reportId: reportId,
            $localPdfUri: (row.localPdfUri as string) ?? null,
            $fileName: (row.fileName as string) ?? null,
            $createdAt: createdAt,
            $updatedAt: createdAt,
          }
        );
      } catch (error) {
        logger.warn('Skipped orphaned report during documents backfill', {
          reportId,
          jobId,
          error: String(error),
        });
      }
    }

    const profileRow = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT nextInvoiceSequence, nextQuoteSequence FROM business_profile WHERE id = 1'
    );
    let nextInvoiceSeq =
      typeof profileRow?.nextInvoiceSequence === 'number' ? profileRow.nextInvoiceSequence : 1;
    let nextQuoteSeq = typeof profileRow?.nextQuoteSequence === 'number' ? profileRow.nextQuoteSequence : 1;

    const summaryRows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM work_summaries WHERE documentType IN ('quote', 'invoice')`
    );
    for (const row of summaryRows) {
      const jobId = row.jobId as string;
      const kind = row.documentType as 'quote' | 'invoice';
      const jobExists = await db.getFirstAsync<{ id: string }>('SELECT id FROM jobs WHERE id = ?', jobId);
      if (!jobExists) continue;

      const dup = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM documents WHERE jobId = ? AND kind = ?',
        jobId,
        kind
      );
      if (dup) continue;

      const pricing = parsePricing(row.pricingJson);
      const breakdown = pricing.enabled ? pricingVatBreakdown(pricing.lines, VAT_RATE_PERCENT) : null;
      const pricingSnapshotJson = pricing.enabled ? JSON.stringify(pricing) : null;
      const updatedAt = (row.updatedAt as string) ?? now;

      let number: string | null = null;
      const invoiceNumber = typeof row.invoiceNumber === 'string' ? row.invoiceNumber.trim() : '';
      if (kind === 'invoice' && invoiceNumber) {
        number = invoiceNumber;
      } else if (kind === 'invoice') {
        number = formatInvoiceNumber(nextInvoiceSeq);
        nextInvoiceSeq += 1;
      } else if (kind === 'quote') {
        number = formatQuoteNumber(nextQuoteSeq);
        nextQuoteSeq += 1;
      }

      try {
        await db.runAsync(
          `INSERT INTO documents (
            id, jobId, kind, number, status, title,
            totalPence, netPence, vatPence,
            dueDate, validUntil, sentAt, paidAt, acceptedAt, declinedAt,
            paidMethod, paidAmountPence, sourceDocumentId, attachedReportId,
            pricingSnapshotJson, reportId, localPdfUri, fileName, createdAt, updatedAt
          ) VALUES (
            $id, $jobId, $kind, $number, 'draft', NULL,
            $totalPence, $netPence, $vatPence,
            NULL, NULL, NULL, NULL, NULL, NULL,
            NULL, NULL, NULL, NULL,
            $pricingSnapshotJson, NULL, NULL, NULL, $createdAt, $updatedAt
          )`,
          {
            $id: generateId(),
            $jobId: jobId,
            $kind: kind,
            $number: number,
            $totalPence: breakdown?.totalPence ?? null,
            $netPence: breakdown?.subtotalPence ?? null,
            $vatPence: breakdown?.vatPence ?? null,
            $pricingSnapshotJson: pricingSnapshotJson,
            $createdAt: updatedAt,
            $updatedAt: updatedAt,
          }
        );
      } catch (error) {
        logger.warn('Skipped orphaned work summary during documents backfill', {
          jobId,
          kind,
          error: String(error),
        });
      }
    }

    await db.runAsync(
      `UPDATE business_profile SET nextInvoiceSequence = $seq, nextQuoteSequence = $quoteSeq WHERE id = 1`,
      { $seq: nextInvoiceSeq, $quoteSeq: nextQuoteSeq }
    );

    await db.execAsync('PRAGMA user_version = 14');
    version = 14;
  }

  if (version < 15) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        postcode TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
      CREATE INDEX IF NOT EXISTS idx_customers_updatedAt ON customers(updatedAt);
    `);

    // customerId / customers table ensured by ensureDocumentsSchema (no ALTER FK).
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_jobs_customerId ON jobs(customerId)');

    const now = new Date().toISOString();
    const jobRows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT id, customerName, address FROM jobs
       WHERE customerName IS NOT NULL AND TRIM(customerName) != ''`
    );
    const customerByKey = new Map<string, string>();

    for (const row of jobRows) {
      const jobId = row.id as string;
      const name = String(row.customerName).trim();
      const address = typeof row.address === 'string' ? row.address.trim() || null : null;
      const key = `${name.toLowerCase()}|${(address ?? '').toLowerCase()}`;
      let customerId = customerByKey.get(key);
      if (!customerId) {
        customerId = generateId();
        customerByKey.set(key, customerId);
        await db.runAsync(
          `INSERT INTO customers (id, name, phone, email, address, postcode, createdAt, updatedAt)
           VALUES ($id, $name, NULL, NULL, $address, NULL, $createdAt, $updatedAt)`,
          {
            $id: customerId,
            $name: name,
            $address: address,
            $createdAt: now,
            $updatedAt: now,
          }
        );
      }
      await db.runAsync('UPDATE jobs SET customerId = ? WHERE id = ?', customerId, jobId);
    }

    const profileColumnsV15 = await db.getAllAsync<{ name: string }>('PRAGMA table_info(business_profile)');
    if (!profileColumnsV15.some((column) => column.name === 'stripePaymentLink')) {
      await db.execAsync('ALTER TABLE business_profile ADD COLUMN stripePaymentLink TEXT');
    }

    await db.execAsync('PRAGMA user_version = 15');
    version = 15;
  }
}

function queueWebSnapshot(db: SQLiteDatabase) {
  if (Platform.OS !== 'web') return;
  snapshotDb = db;
  if (snapshotTimer) clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => {
    void flushWebDatabase();
  }, 200);
}

function trackWrites(db: SQLiteDatabase): SQLiteDatabase {
  if (Platform.OS !== 'web') return db;

  const run = db.runAsync.bind(db);
  const exec = db.execAsync.bind(db);
  const transaction = db.withTransactionAsync.bind(db);

  db.runAsync = (async (source: string, params?: SQLiteBindParams) => {
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

async function openDatabase(): Promise<SQLiteDatabase> {
  const SQLite = await loadSQLite();

  if (Platform.OS !== 'web') {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await enableForeignKeys(db);
    await migrate(db);
    return db;
  }

  installSnapshotLifecycle();
  let db: SQLiteDatabase;
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

export async function getDatabase(): Promise<SQLiteDatabase> {
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

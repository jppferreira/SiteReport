import * as SQLite from 'expo-sqlite';

import type {
  BusinessProfile,
  Job,
  JobStatus,
  Photo,
  PhotoType,
  Report,
  ReportStatus,
  Signature,
  WorkSummary,
} from '@/models/domain';
import { nowIso } from '@/utils/date';
import { createId } from '@/utils/id';

type CreateJobInput = {
  title: string;
  customerName?: string | null;
  address?: string | null;
  jobDate?: string;
  referenceNumber?: string | null;
  description?: string | null;
};

type UpdateJobInput = Partial<Omit<Job, 'id' | 'createdAt'>>;

type CreatePhotoInput = {
  jobId: string;
  localUri: string;
  thumbnailUri: string | null;
  type: PhotoType;
  caption?: string | null;
};

type UpdatePhotoInput = Partial<Pick<Photo, 'type' | 'caption' | 'sortOrder' | 'localUri' | 'thumbnailUri'>>;

type UpsertWorkSummaryInput = Omit<WorkSummary, 'jobId'>;

type UpsertSignatureInput = {
  customerName: string | null;
  localSignatureUri: string;
  signedAt: string;
};

type UpsertBusinessProfileInput = Partial<BusinessProfile>;

type CreateReportInput = {
  jobId: string;
  localPdfUri: string;
  fileSize: number;
  version: number;
};

const DATABASE_NAME = 'sitereport.db';

const defaultBusinessProfile: BusinessProfile = {
  businessName: '',
  logoUri: null,
  name: null,
  email: null,
  phone: null,
  website: null,
  address: null,
  registrationNumber: null,
  vatNumber: null,
  accentColour: '#34D058',
  footerMessage: null,
};

class DatabaseService {
  private dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
  private didInit = false;

  private async db() {
    if (!this.dbPromise) {
      this.dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME);
    }
    return this.dbPromise;
  }

  async init() {
    if (this.didInit) {
      return;
    }

    const db = await this.db();
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        customer_name TEXT,
        address TEXT,
        job_date TEXT NOT NULL,
        reference_number TEXT,
        description TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY NOT NULL,
        job_id TEXT NOT NULL,
        local_uri TEXT NOT NULL,
        thumbnail_uri TEXT,
        type TEXT NOT NULL,
        caption TEXT,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS work_summaries (
        job_id TEXT PRIMARY KEY NOT NULL,
        work_completed TEXT,
        materials TEXT,
        recommendations TEXT,
        notes TEXT,
        FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS signatures (
        job_id TEXT PRIMARY KEY NOT NULL,
        customer_name TEXT,
        local_signature_uri TEXT NOT NULL,
        signed_at TEXT NOT NULL,
        FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY NOT NULL,
        job_id TEXT NOT NULL,
        local_pdf_uri TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        version INTEGER NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS business_profile (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        business_name TEXT NOT NULL,
        logo_uri TEXT,
        name TEXT,
        email TEXT,
        phone TEXT,
        website TEXT,
        address TEXT,
        registration_number TEXT,
        vat_number TEXT,
        accent_colour TEXT NOT NULL,
        footer_message TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON jobs(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_photos_job_id ON photos(job_id, type, sort_order);
      CREATE INDEX IF NOT EXISTS idx_reports_job_id ON reports(job_id, generated_at DESC);
    `);

    const existingProfile = await db.getFirstAsync<{ id: number }>('SELECT id FROM business_profile WHERE id = 1');
    if (!existingProfile) {
      await db.runAsync(
        `INSERT INTO business_profile (
          id, business_name, logo_uri, name, email, phone, website, address, registration_number, vat_number, accent_colour, footer_message
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        defaultBusinessProfile.businessName,
        defaultBusinessProfile.logoUri,
        defaultBusinessProfile.name,
        defaultBusinessProfile.email,
        defaultBusinessProfile.phone,
        defaultBusinessProfile.website,
        defaultBusinessProfile.address,
        defaultBusinessProfile.registrationNumber,
        defaultBusinessProfile.vatNumber,
        defaultBusinessProfile.accentColour,
        defaultBusinessProfile.footerMessage
      );
    }

    this.didInit = true;
  }

  private mapJob(row: Record<string, unknown>): Job {
    return {
      id: row.id as string,
      title: row.title as string,
      customerName: (row.customer_name as string | null) ?? null,
      address: (row.address as string | null) ?? null,
      jobDate: row.job_date as string,
      referenceNumber: (row.reference_number as string | null) ?? null,
      description: (row.description as string | null) ?? null,
      status: row.status as JobStatus,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapPhoto(row: Record<string, unknown>): Photo {
    return {
      id: row.id as string,
      jobId: row.job_id as string,
      localUri: row.local_uri as string,
      thumbnailUri: (row.thumbnail_uri as string | null) ?? null,
      type: row.type as PhotoType,
      caption: (row.caption as string | null) ?? null,
      sortOrder: Number(row.sort_order),
      createdAt: row.created_at as string,
    };
  }

  private mapReport(row: Record<string, unknown>): Report {
    return {
      id: row.id as string,
      jobId: row.job_id as string,
      localPdfUri: row.local_pdf_uri as string,
      generatedAt: row.generated_at as string,
      fileSize: Number(row.file_size),
      version: Number(row.version),
      status: row.status as ReportStatus,
    };
  }

  async listJobs(searchTerm: string, status: JobStatus | 'all') {
    const db = await this.db();
    const search = `%${searchTerm.trim()}%`;
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM jobs
        WHERE (? = 'all' OR status = ?)
          AND (? = '%%' OR title LIKE ? OR IFNULL(customer_name, '') LIKE ? OR IFNULL(reference_number, '') LIKE ?)
        ORDER BY updated_at DESC`,
      status,
      status,
      search,
      search,
      search,
      search
    );

    return rows.map((row) => this.mapJob(row));
  }

  async createJob(input: CreateJobInput) {
    const db = await this.db();
    const id = createId();
    const now = nowIso();
    await db.runAsync(
      `INSERT INTO jobs (
        id, title, customer_name, address, job_date, reference_number, description, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.title.trim(),
      input.customerName?.trim() || null,
      input.address?.trim() || null,
      input.jobDate ?? now,
      input.referenceNumber?.trim() || null,
      input.description?.trim() || null,
      'draft',
      now,
      now
    );

    return this.getJob(id);
  }

  async getJob(jobId: string) {
    const db = await this.db();
    const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM jobs WHERE id = ?', jobId);
    if (!row) {
      return null;
    }
    return this.mapJob(row);
  }

  async updateJob(jobId: string, updates: UpdateJobInput) {
    const db = await this.db();
    const current = await this.getJob(jobId);
    if (!current) {
      throw new Error('Job not found');
    }

    const merged: Job = {
      ...current,
      ...updates,
      updatedAt: nowIso(),
    };

    await db.runAsync(
      `UPDATE jobs SET
        title = ?,
        customer_name = ?,
        address = ?,
        job_date = ?,
        reference_number = ?,
        description = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?`,
      merged.title.trim(),
      merged.customerName?.trim() || null,
      merged.address?.trim() || null,
      merged.jobDate,
      merged.referenceNumber?.trim() || null,
      merged.description?.trim() || null,
      merged.status,
      merged.updatedAt,
      jobId
    );

    return this.getJob(jobId);
  }

  async deleteJob(jobId: string) {
    const db = await this.db();
    const photoRows = await db.getAllAsync<{ local_uri: string; thumbnail_uri: string | null }>(
      'SELECT local_uri, thumbnail_uri FROM photos WHERE job_id = ?',
      jobId
    );
    const signatureRow = await db.getFirstAsync<{ local_signature_uri: string | null }>(
      'SELECT local_signature_uri FROM signatures WHERE job_id = ?',
      jobId
    );
    const reportRows = await db.getAllAsync<{ local_pdf_uri: string }>('SELECT local_pdf_uri FROM reports WHERE job_id = ?', jobId);

    await db.runAsync('DELETE FROM jobs WHERE id = ?', jobId);

    return {
      photoUris: photoRows.flatMap((row) => [row.local_uri, row.thumbnail_uri]).filter(Boolean) as string[],
      signatureUri: signatureRow?.local_signature_uri ?? null,
      reportUris: reportRows.map((row) => row.local_pdf_uri),
    };
  }

  async getPhotos(jobId: string, type?: PhotoType) {
    const db = await this.db();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM photos WHERE job_id = ? ${type ? 'AND type = ?' : ''} ORDER BY sort_order ASC, created_at ASC`,
      ...(type ? [jobId, type] : [jobId])
    );
    return rows.map((row) => this.mapPhoto(row));
  }

  async createPhoto(input: CreatePhotoInput) {
    const db = await this.db();
    const id = createId();
    const now = nowIso();
    const maxOrder = await db.getFirstAsync<{ max_order: number | null }>(
      'SELECT MAX(sort_order) as max_order FROM photos WHERE job_id = ? AND type = ?',
      input.jobId,
      input.type
    );
    const nextSort = (maxOrder?.max_order ?? -1) + 1;

    await db.runAsync(
      `INSERT INTO photos (id, job_id, local_uri, thumbnail_uri, type, caption, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.jobId,
      input.localUri,
      input.thumbnailUri,
      input.type,
      input.caption ?? null,
      nextSort,
      now
    );

    const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM photos WHERE id = ?', id);
    return row ? this.mapPhoto(row) : null;
  }

  async updatePhoto(photoId: string, updates: UpdatePhotoInput) {
    const db = await this.db();
    const current = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM photos WHERE id = ?', photoId);
    if (!current) {
      throw new Error('Photo not found');
    }
    const mapped = this.mapPhoto(current);
    const merged = { ...mapped, ...updates };

    await db.runAsync(
      `UPDATE photos SET
        local_uri = ?,
        thumbnail_uri = ?,
        type = ?,
        caption = ?,
        sort_order = ?
       WHERE id = ?`,
      merged.localUri,
      merged.thumbnailUri,
      merged.type,
      merged.caption ?? null,
      merged.sortOrder,
      photoId
    );

    const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM photos WHERE id = ?', photoId);
    return row ? this.mapPhoto(row) : null;
  }

  async reorderPhotos(jobId: string, type: PhotoType, orderedIds: string[]) {
    const db = await this.db();
    await db.withTransactionAsync(async () => {
      for (const [sortOrder, id] of orderedIds.entries()) {
        await db.runAsync('UPDATE photos SET sort_order = ? WHERE id = ? AND job_id = ? AND type = ?', sortOrder, id, jobId, type);
      }
    });
  }

  async deletePhoto(photoId: string) {
    const db = await this.db();
    const row = await db.getFirstAsync<{ local_uri: string; thumbnail_uri: string | null }>(
      'SELECT local_uri, thumbnail_uri FROM photos WHERE id = ?',
      photoId
    );
    await db.runAsync('DELETE FROM photos WHERE id = ?', photoId);
    return row;
  }

  async upsertWorkSummary(jobId: string, input: UpsertWorkSummaryInput) {
    const db = await this.db();
    await db.runAsync(
      `INSERT INTO work_summaries (job_id, work_completed, materials, recommendations, notes)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(job_id) DO UPDATE SET
         work_completed = excluded.work_completed,
         materials = excluded.materials,
         recommendations = excluded.recommendations,
         notes = excluded.notes`,
      jobId,
      input.workCompleted?.trim() || null,
      input.materials?.trim() || null,
      input.recommendations?.trim() || null,
      input.notes?.trim() || null
    );
  }

  async getWorkSummary(jobId: string): Promise<WorkSummary | null> {
    const db = await this.db();
    const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM work_summaries WHERE job_id = ?', jobId);
    if (!row) {
      return null;
    }
    return {
      jobId,
      workCompleted: (row.work_completed as string | null) ?? null,
      materials: (row.materials as string | null) ?? null,
      recommendations: (row.recommendations as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
    };
  }

  async upsertSignature(jobId: string, input: UpsertSignatureInput) {
    const db = await this.db();
    await db.runAsync(
      `INSERT INTO signatures (job_id, customer_name, local_signature_uri, signed_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(job_id) DO UPDATE SET
         customer_name = excluded.customer_name,
         local_signature_uri = excluded.local_signature_uri,
         signed_at = excluded.signed_at`,
      jobId,
      input.customerName?.trim() || null,
      input.localSignatureUri,
      input.signedAt
    );
  }

  async getSignature(jobId: string): Promise<Signature | null> {
    const db = await this.db();
    const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM signatures WHERE job_id = ?', jobId);
    if (!row) {
      return null;
    }
    return {
      jobId,
      customerName: (row.customer_name as string | null) ?? null,
      localSignatureUri: row.local_signature_uri as string,
      signedAt: row.signed_at as string,
    };
  }

  async deleteSignature(jobId: string) {
    const db = await this.db();
    const row = await db.getFirstAsync<{ local_signature_uri: string | null }>(
      'SELECT local_signature_uri FROM signatures WHERE job_id = ?',
      jobId
    );
    await db.runAsync('DELETE FROM signatures WHERE job_id = ?', jobId);
    return row?.local_signature_uri ?? null;
  }

  async getBusinessProfile(): Promise<BusinessProfile> {
    const db = await this.db();
    const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM business_profile WHERE id = 1');
    if (!row) {
      return defaultBusinessProfile;
    }

    return {
      businessName: (row.business_name as string) ?? '',
      logoUri: (row.logo_uri as string | null) ?? null,
      name: (row.name as string | null) ?? null,
      email: (row.email as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      website: (row.website as string | null) ?? null,
      address: (row.address as string | null) ?? null,
      registrationNumber: (row.registration_number as string | null) ?? null,
      vatNumber: (row.vat_number as string | null) ?? null,
      accentColour: (row.accent_colour as string) ?? '#34D058',
      footerMessage: (row.footer_message as string | null) ?? null,
    };
  }

  async upsertBusinessProfile(input: UpsertBusinessProfileInput) {
    const db = await this.db();
    const current = await this.getBusinessProfile();
    const merged = { ...current, ...input };

    await db.runAsync(
      `UPDATE business_profile SET
        business_name = ?,
        logo_uri = ?,
        name = ?,
        email = ?,
        phone = ?,
        website = ?,
        address = ?,
        registration_number = ?,
        vat_number = ?,
        accent_colour = ?,
        footer_message = ?
      WHERE id = 1`,
      merged.businessName.trim(),
      merged.logoUri,
      merged.name?.trim() || null,
      merged.email?.trim() || null,
      merged.phone?.trim() || null,
      merged.website?.trim() || null,
      merged.address?.trim() || null,
      merged.registrationNumber?.trim() || null,
      merged.vatNumber?.trim() || null,
      merged.accentColour,
      merged.footerMessage?.trim() || null
    );
  }

  async setSetting(key: string, value: string) {
    const db = await this.db();
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      key,
      value
    );
  }

  async getSetting(key: string): Promise<string | null> {
    const db = await this.db();
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
    return row?.value ?? null;
  }

  async listReports() {
    const db = await this.db();
    const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM reports ORDER BY generated_at DESC');
    return rows.map((row) => this.mapReport(row));
  }

  async listReportsByJob(jobId: string) {
    const db = await this.db();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM reports WHERE job_id = ? ORDER BY generated_at DESC',
      jobId
    );
    return rows.map((row) => this.mapReport(row));
  }

  async createReport(input: CreateReportInput) {
    const db = await this.db();
    const id = createId();
    const generatedAt = nowIso();

    await db.runAsync('UPDATE reports SET status = ? WHERE job_id = ?', 'stale', input.jobId);
    await db.runAsync(
      `INSERT INTO reports (id, job_id, local_pdf_uri, generated_at, file_size, version, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.jobId,
      input.localPdfUri,
      generatedAt,
      input.fileSize,
      input.version,
      'current'
    );

    const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM reports WHERE id = ?', id);
    return row ? this.mapReport(row) : null;
  }

  async deleteReport(reportId: string) {
    const db = await this.db();
    const row = await db.getFirstAsync<{ local_pdf_uri: string }>('SELECT local_pdf_uri FROM reports WHERE id = ?', reportId);
    await db.runAsync('DELETE FROM reports WHERE id = ?', reportId);
    return row?.local_pdf_uri ?? null;
  }

  async markReportsStale(jobId: string) {
    const db = await this.db();
    await db.runAsync('UPDATE reports SET status = ? WHERE job_id = ?', 'stale', jobId);
  }

  async getGeneratedReportCount() {
    const db = await this.db();
    const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM reports');
    return Number(row?.count ?? 0);
  }

  async deleteAllData() {
    const db = await this.db();
    const photoRows = await db.getAllAsync<{ local_uri: string; thumbnail_uri: string | null }>(
      'SELECT local_uri, thumbnail_uri FROM photos'
    );
    const signatureRows = await db.getAllAsync<{ local_signature_uri: string }>('SELECT local_signature_uri FROM signatures');
    const reportRows = await db.getAllAsync<{ local_pdf_uri: string }>('SELECT local_pdf_uri FROM reports');

    await db.execAsync(`
      DELETE FROM reports;
      DELETE FROM signatures;
      DELETE FROM work_summaries;
      DELETE FROM photos;
      DELETE FROM jobs;
    `);

    return {
      photoUris: photoRows.flatMap((row) => [row.local_uri, row.thumbnail_uri]).filter(Boolean) as string[],
      signatureUris: signatureRows.map((row) => row.local_signature_uri),
      reportUris: reportRows.map((row) => row.local_pdf_uri),
    };
  }
}

export const databaseService = new DatabaseService();

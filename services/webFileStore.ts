import { indexedDbAvailable, openDatabase, requestToPromise } from '@/utils/idb';

export type FileInfo = { exists: boolean; isDirectory: boolean; size: number };
export type FileEncoding = 'utf8' | 'base64';

type FileRecord = { bytes: Uint8Array; mime: string; directory: boolean };

export interface FileBackend {
  get(path: string): Promise<FileRecord | null>;
  put(path: string, record: FileRecord): Promise<void>;
  remove(path: string): Promise<void>;
  keys(): Promise<string[]>;
}

const FILE_DB = 'sitereport-files';
const FILE_STORE = 'files';

type StoredFile = { buffer: ArrayBuffer; mime: string; directory: boolean };

export class MemoryFileBackend implements FileBackend {
  private readonly records = new Map<string, FileRecord>();

  async get(path: string): Promise<FileRecord | null> {
    return this.records.get(path) ?? null;
  }

  async put(path: string, record: FileRecord): Promise<void> {
    this.records.set(path, record);
  }

  async remove(path: string): Promise<void> {
    this.records.delete(path);
  }

  async keys(): Promise<string[]> {
    return [...this.records.keys()];
  }
}

class IndexedDbFileBackend implements FileBackend {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDatabase(FILE_DB, FILE_STORE);
    }
    return this.dbPromise;
  }

  async get(path: string): Promise<FileRecord | null> {
    const db = await this.db();
    const stored = await requestToPromise(db.transaction(FILE_STORE, 'readonly').objectStore(FILE_STORE).get(path));
    if (!stored) return null;
    const record = stored as StoredFile;
    return { bytes: new Uint8Array(record.buffer), mime: record.mime, directory: record.directory };
  }

  async put(path: string, record: FileRecord): Promise<void> {
    const db = await this.db();
    const copy = new Uint8Array(record.bytes);
    const stored: StoredFile = { buffer: copy.buffer, mime: record.mime, directory: record.directory };
    await requestToPromise(db.transaction(FILE_STORE, 'readwrite').objectStore(FILE_STORE).put(stored, path));
  }

  async remove(path: string): Promise<void> {
    const db = await this.db();
    await requestToPromise(db.transaction(FILE_STORE, 'readwrite').objectStore(FILE_STORE).delete(path));
  }

  async keys(): Promise<string[]> {
    const db = await this.db();
    const store = db.transaction(FILE_STORE, 'readonly').objectStore(FILE_STORE);
    const names: string[] = [];
    await new Promise<void>((resolve, reject) => {
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve();
          return;
        }
        names.push(String(cursor.key));
        cursor.continue();
      };
      request.onerror = () => reject(request.error ?? new Error('IndexedDB cursor failed'));
    });
    return names;
  }
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function mimeForPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'svg':
      return 'image/svg+xml';
    case 'html':
      return 'text/html';
    case 'json':
      return 'application/json';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

function asDirectoryKey(path: string): string {
  const trimmed = path.replace(/\/+$/, '');
  return trimmed ? `${trimmed}/` : '';
}

function asFileKey(path: string): string {
  return path.replace(/\/+$/, '');
}

async function readExternal(uri: string): Promise<{ bytes: Uint8Array; mime: string }> {
  if (uri.startsWith('data:')) {
    const comma = uri.indexOf(',');
    const header = uri.slice(5, comma);
    const data = uri.slice(comma + 1);
    const mime = header.split(';')[0] || 'application/octet-stream';
    if (header.includes(';base64')) {
      return { bytes: decodeBase64(data), mime };
    }
    return { bytes: new TextEncoder().encode(decodeURIComponent(data)), mime };
  }

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Could not read that file');
  }
  const mime = response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream';
  return { bytes: new Uint8Array(await response.arrayBuffer()), mime };
}

export function createFileStore(backend: FileBackend) {
  const displayUrls = new Map<string, string>();

  function revokeDisplayUrl(path: string) {
    const existing = displayUrls.get(path);
    if (existing && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(existing);
    }
    displayUrls.delete(path);
  }

  async function getInfo(path: string): Promise<FileInfo> {
    const fileKey = asFileKey(path);
    const record = await backend.get(fileKey);
    if (record && !record.directory) {
      return { exists: true, isDirectory: false, size: record.bytes.byteLength };
    }
    const dirKey = asDirectoryKey(path);
    const marker = await backend.get(dirKey);
    const keys = await backend.keys();
    const hasChild = keys.some((key) => key.startsWith(dirKey) && key !== dirKey);
    if ((marker && marker.directory) || hasChild) {
      return { exists: true, isDirectory: true, size: 0 };
    }
    return { exists: false, isDirectory: false, size: 0 };
  }

  async function makeDirectory(path: string): Promise<void> {
    const dirKey = asDirectoryKey(path);
    const parts = dirKey.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current += `${part}/`;
      const existing = await backend.get(current);
      if (!existing) {
        await backend.put(current, { bytes: new Uint8Array(), mime: 'application/x-directory', directory: true });
      }
    }
  }

  async function readDirectory(path: string): Promise<string[]> {
    const info = await getInfo(path);
    if (!info.exists || !info.isDirectory) {
      throw new Error('Directory does not exist');
    }
    const dirKey = asDirectoryKey(path);
    const keys = await backend.keys();
    const names = new Set<string>();
    for (const key of keys) {
      if (!key.startsWith(dirKey) || key === dirKey) continue;
      const rest = key.slice(dirKey.length);
      const name = rest.split('/')[0];
      if (name) names.add(name);
    }
    return [...names];
  }

  async function writeBytes(path: string, bytes: Uint8Array, mime: string): Promise<void> {
    const fileKey = asFileKey(path);
    const slash = fileKey.lastIndexOf('/');
    if (slash > 0) {
      await makeDirectory(fileKey.slice(0, slash));
    }
    revokeDisplayUrl(fileKey);
    await backend.put(fileKey, { bytes, mime, directory: false });
  }

  async function writeString(path: string, contents: string, encoding: FileEncoding): Promise<void> {
    const bytes = encoding === 'base64' ? decodeBase64(contents) : new TextEncoder().encode(contents);
    await writeBytes(path, bytes, mimeForPath(path));
  }

  async function readString(path: string, encoding: FileEncoding): Promise<string | null> {
    const record = await backend.get(asFileKey(path));
    if (!record || record.directory) return null;
    if (encoding === 'base64') return encodeBase64(record.bytes);
    return new TextDecoder().decode(record.bytes);
  }

  async function copy(from: string, to: string): Promise<void> {
    const stored = await backend.get(asFileKey(from));
    if (stored && !stored.directory) {
      await writeBytes(to, stored.bytes, stored.mime || mimeForPath(to));
      return;
    }
    const external = await readExternal(from);
    await writeBytes(to, external.bytes, external.mime || mimeForPath(to));
  }

  async function remove(path: string): Promise<void> {
    const fileKey = asFileKey(path);
    const dirKey = asDirectoryKey(path);
    const keys = await backend.keys();
    for (const key of keys) {
      if (key === fileKey || key === dirKey || key.startsWith(dirKey)) {
        revokeDisplayUrl(key);
        await backend.remove(key);
      }
    }
  }

  async function displayUri(path: string): Promise<string | null> {
    if (path.startsWith('blob:') || path.startsWith('data:') || path.includes('://')) {
      return path;
    }
    const fileKey = asFileKey(path);
    const cached = displayUrls.get(fileKey);
    if (cached) return cached;
    const record = await backend.get(fileKey);
    if (!record || record.directory) return null;
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return null;
    const copy = new ArrayBuffer(record.bytes.byteLength);
    new Uint8Array(copy).set(record.bytes);
    const url = URL.createObjectURL(new Blob([copy], { type: record.mime }));
    displayUrls.set(fileKey, url);
    return url;
  }

  return { getInfo, makeDirectory, readDirectory, writeString, readString, copy, remove, displayUri };
}

export type WebFileStore = ReturnType<typeof createFileStore>;

let singleton: WebFileStore | null = null;

export function getWebFileStore(): WebFileStore {
  if (!singleton) {
    const backend = indexedDbAvailable() ? new IndexedDbFileBackend() : new MemoryFileBackend();
    singleton = createFileStore(backend);
  }
  return singleton;
}

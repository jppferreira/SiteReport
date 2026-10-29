import { indexedDbAvailable, openDatabase, requestToPromise } from '@/utils/idb';

const DB_NAME = 'sitereport-sqlite';
const STORE = 'snapshot';
const KEY = 'main';

async function database(): Promise<IDBDatabase | null> {
  if (!indexedDbAvailable()) return null;
  return openDatabase(DB_NAME, STORE);
}

/** Reads the last on-device copy of the web database, if one has been saved. */
export async function readDatabaseSnapshot(): Promise<Uint8Array | null> {
  const db = await database();
  if (!db) return null;
  const stored = await requestToPromise(db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY));
  if (!stored) return null;
  return new Uint8Array(stored as ArrayBuffer);
}

/** Writes the full database bytes so the next launch can restore them offline. */
export async function writeDatabaseSnapshot(bytes: Uint8Array): Promise<void> {
  const db = await database();
  if (!db) return;
  const copy = new Uint8Array(bytes);
  await requestToPromise(db.transaction(STORE, 'readwrite').objectStore(STORE).put(copy.buffer, KEY));
}

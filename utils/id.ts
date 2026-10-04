import * as Crypto from 'expo-crypto';

/** Generates a RFC-4122-ish unique id for locally created records. */
export function generateId(): string {
  return Crypto.randomUUID();
}

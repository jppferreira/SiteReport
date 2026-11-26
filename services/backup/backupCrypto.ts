import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  deriveAesGcmKeyBytes,
  randomBytes,
} from './runtimeCrypto';

const MAGIC = new TextEncoder().encode('TRBE1');
const SALT_BYTES = 16;
const IV_BYTES = 12;
const PBKDF2_ITERATIONS = 120_000;

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let index = 0; index < a.byteLength; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

export function isEncryptedBackup(bytes: Uint8Array): boolean {
  return bytes.byteLength >= MAGIC.byteLength && bytesEqual(bytes.subarray(0, MAGIC.byteLength), MAGIC);
}

/** Wraps a plain backup zip with TRBE1 + salt + iv + AES-GCM ciphertext. */
export async function encryptBackupZip(zipBytes: Uint8Array, password: string): Promise<Uint8Array> {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = await deriveAesGcmKeyBytes(password, salt, PBKDF2_ITERATIONS);
  const ciphertext = await aesGcmEncrypt(key, iv, zipBytes);
  return concat([MAGIC, salt, iv, ciphertext]);
}

export async function decryptBackupZip(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  if (!isEncryptedBackup(bytes)) throw new Error('Not an encrypted backup');
  const salt = bytes.subarray(MAGIC.byteLength, MAGIC.byteLength + SALT_BYTES);
  const iv = bytes.subarray(MAGIC.byteLength + SALT_BYTES, MAGIC.byteLength + SALT_BYTES + IV_BYTES);
  const ciphertext = bytes.subarray(MAGIC.byteLength + SALT_BYTES + IV_BYTES);
  const key = await deriveAesGcmKeyBytes(password, salt, PBKDF2_ITERATIONS);
  return aesGcmDecrypt(key, iv, ciphertext);
}

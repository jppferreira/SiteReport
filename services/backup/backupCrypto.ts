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

function arrayBuffer(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: arrayBuffer(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Wraps a plain backup zip with TRBE1 + salt + iv + AES-GCM ciphertext. */
export async function encryptBackupZip(zipBytes: Uint8Array, password: string): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);
  const copy = zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength) as ArrayBuffer;
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: arrayBuffer(iv) }, key, copy));
  return concat([MAGIC, salt, iv, ciphertext]);
}

export async function decryptBackupZip(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  if (!isEncryptedBackup(bytes)) throw new Error('Not an encrypted backup');
  const salt = bytes.subarray(MAGIC.byteLength, MAGIC.byteLength + SALT_BYTES);
  const iv = bytes.subarray(MAGIC.byteLength + SALT_BYTES, MAGIC.byteLength + SALT_BYTES + IV_BYTES);
  const ciphertext = bytes.subarray(MAGIC.byteLength + SALT_BYTES + IV_BYTES);
  const key = await deriveKey(password, salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: arrayBuffer(iv) }, key, arrayBuffer(ciphertext));
  return new Uint8Array(plain);
}
import { gcm } from '@noble/ciphers/aes';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 as nobleSha256 } from '@noble/hashes/sha2';
import * as ExpoCrypto from 'expo-crypto';

/**
 * Hermes does not expose a free `crypto` binding. Prefer Web Crypto when the
 * runtime provides it (Jest / web), otherwise use expo-crypto + noble.
 */

function arrayBufferOf(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}

function webCrypto(): Crypto | undefined {
  return globalThis.crypto as Crypto | undefined;
}

export async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  const subtle = webCrypto()?.subtle;
  if (subtle) {
    return new Uint8Array(await subtle.digest('SHA-256', arrayBufferOf(data)));
  }
  return new Uint8Array(
    await ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, arrayBufferOf(data))
  );
}

export function randomBytes(length: number): Uint8Array {
  const cryptoObj = webCrypto();
  if (cryptoObj?.getRandomValues) {
    return cryptoObj.getRandomValues(new Uint8Array(length));
  }
  return ExpoCrypto.getRandomBytes(length);
}

export async function deriveAesGcmKeyBytes(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const subtle = webCrypto()?.subtle;
  if (subtle) {
    const material = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await subtle.deriveBits(
      { name: 'PBKDF2', salt: arrayBufferOf(salt), iterations, hash: 'SHA-256' },
      material,
      256
    );
    return new Uint8Array(bits);
  }
  return pbkdf2(nobleSha256, password, salt, { c: iterations, dkLen: 32 });
}

export async function aesGcmEncrypt(key: Uint8Array, iv: Uint8Array, plain: Uint8Array): Promise<Uint8Array> {
  const subtle = webCrypto()?.subtle;
  if (subtle) {
    const cryptoKey = await subtle.importKey('raw', arrayBufferOf(key), { name: 'AES-GCM' }, false, ['encrypt']);
    return new Uint8Array(
      await subtle.encrypt({ name: 'AES-GCM', iv: arrayBufferOf(iv) }, cryptoKey, arrayBufferOf(plain))
    );
  }
  return gcm(key, iv).encrypt(plain);
}

export async function aesGcmDecrypt(key: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array): Promise<Uint8Array> {
  const subtle = webCrypto()?.subtle;
  if (subtle) {
    const cryptoKey = await subtle.importKey('raw', arrayBufferOf(key), { name: 'AES-GCM' }, false, ['decrypt']);
    return new Uint8Array(
      await subtle.decrypt({ name: 'AES-GCM', iv: arrayBufferOf(iv) }, cryptoKey, arrayBufferOf(ciphertext))
    );
  }
  return gcm(key, iv).decrypt(ciphertext);
}

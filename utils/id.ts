/**
 * Generates a unique id for locally created records.
 * Prefer the platform crypto API so routes don't crash at import time when
 * ExpoCrypto isn't linked yet (stale Expo Go / unmet native rebuild).
 */
export function generateId(): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  // Last-resort fallback for very old runtimes — not cryptographically strong.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const nibble = (Math.random() * 16) | 0;
    const value = char === 'x' ? nibble : (nibble & 0x3) | 0x8;
    return value.toString(16);
  });
}

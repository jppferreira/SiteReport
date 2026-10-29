/**
 * Expo Go on Android stores each project under a directory whose name is a
 * percent-encoded scope key (`@anonymous/…` → `%40anonymous%2F…`). The URI
 * handed back by `documentDirectory` encodes that `%` again (`%2540`).
 * File-system calls then disagree about which spelling is readable, so reads
 * try the original URI and the neighbouring encodings. Error messages may
 * also show one extra `%25` layer, so peel until the path stabilises.
 */
export function fileUriReadCandidates(uri: string): string[] {
  const candidates = [uri];
  let current = uri;
  while (current.includes('%25')) {
    current = current.replace(/%25/g, '%');
    candidates.push(current);
  }
  if (uri.includes('%')) {
    candidates.push(uri.replace(/%/g, '%25'));
  }
  return [...new Set(candidates)];
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return globalThis.btoa(binary);
}

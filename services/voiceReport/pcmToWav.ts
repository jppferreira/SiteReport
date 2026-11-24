import { bytesToBase64 } from '@/services/fileUri';

import { VOICE_BITS_PER_SAMPLE, VOICE_CHANNELS, VOICE_SAMPLE_RATE } from './constants';

function writeString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

/**
 * Wraps raw little-endian PCM16 samples in a WAV container whisper.rn can decode.
 */
export function pcm16ToWavBytes(
  pcm: Uint8Array,
  sampleRate = VOICE_SAMPLE_RATE,
  channels = VOICE_CHANNELS,
  bitsPerSample = VOICE_BITS_PER_SAMPLE
): Uint8Array {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  new Uint8Array(buffer, 44).set(pcm);
  return new Uint8Array(buffer);
}

export function pcm16ToWavBase64(
  pcm: Uint8Array,
  sampleRate = VOICE_SAMPLE_RATE,
  channels = VOICE_CHANNELS,
  bitsPerSample = VOICE_BITS_PER_SAMPLE
): string {
  return bytesToBase64(pcm16ToWavBytes(pcm, sampleRate, channels, bitsPerSample));
}

/** Rough 0–1 level from a PCM16 little-endian chunk for the level meter. */
export function pcm16Metering(pcmBase64Chunk: string): number {
  const binary = globalThis.atob(pcmBase64Chunk);
  if (binary.length < 4) return 0;
  let sumSquares = 0;
  let samples = 0;
  for (let i = 0; i + 1 < binary.length; i += 2) {
    const sample = (binary.charCodeAt(i) | (binary.charCodeAt(i + 1) << 8)) << 16 >> 16;
    sumSquares += sample * sample;
    samples += 1;
  }
  if (samples === 0) return 0;
  const rms = Math.sqrt(sumSquares / samples) / 32768;
  return Math.max(0, Math.min(1, rms * 3));
}

export function concatUint8(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

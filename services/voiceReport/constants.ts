/** Maximum recording length — enough for a natural full job description. */
export const MAX_RECORDING_MS = 120_000;

/** Whisper expects 16 kHz mono PCM. */
export const VOICE_SAMPLE_RATE = 16_000;
export const VOICE_CHANNELS = 1;
export const VOICE_BITS_PER_SAMPLE = 16;

/** Android MediaRecorder.AudioSource.VOICE_RECOGNITION */
export const ANDROID_VOICE_RECOGNITION_SOURCE = 6;

export const WHISPER_MODEL_ID = 'tiny.en' as const;

/** Bundled English Whisper model asset id (see MODEL.md). Lazy so Jest can load pure helpers without the .bin. */
export function getWhisperModelAsset(): number {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../assets/whisper/ggml-tiny.en.bin') as number;
}

/** Maximum recording length — enough for a natural full job description. */
export const MAX_RECORDING_MS = 120_000;

/** Whisper expects 16 kHz mono PCM. */
export const VOICE_SAMPLE_RATE = 16_000;
export const VOICE_CHANNELS = 1;
export const VOICE_BITS_PER_SAMPLE = 16;

/** Android MediaRecorder.AudioSource.VOICE_RECOGNITION */
export const ANDROID_VOICE_RECOGNITION_SOURCE = 6;

export {
  WHISPER_MODEL_BYTES,
  WHISPER_MODEL_ID,
  WHISPER_MODEL_SIZE_LABEL,
  WHISPER_MODEL_URL,
} from './whisperModelConfig';

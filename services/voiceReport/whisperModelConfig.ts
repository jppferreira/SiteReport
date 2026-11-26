/**
 * Pinned Whisper `tiny.en` GGML model for on-demand download.
 *
 * Source: Hugging Face `ggerganov/whisper.cpp` (MIT / OpenAI Whisper MIT).
 * URL is pinned to a repo commit so the bytes cannot drift under `/main`.
 * SHA-256 is the content hash (Hugging Face `x-linked-etag`), not the LFS pointer oid.
 */

export const WHISPER_MODEL_ID = 'tiny.en' as const;

export const WHISPER_MODEL_FILENAME = 'ggml-tiny.en.bin' as const;

/** Hugging Face commit that publishes the bytes we ship against. */
export const WHISPER_MODEL_HF_COMMIT = '5359861c739e955e79d9a303bcbc70fb988958b1';

export const WHISPER_MODEL_URL =
  `https://huggingface.co/ggerganov/whisper.cpp/resolve/${WHISPER_MODEL_HF_COMMIT}/${WHISPER_MODEL_FILENAME}`;

/** Exact byte length of the pinned model. */
export const WHISPER_MODEL_BYTES = 77_704_715;

/** Lowercase hex SHA-256 of the pinned model bytes. */
export const WHISPER_MODEL_SHA256 =
  '921e4cf8686fdd993dcd081a5da5b6c365bfde1162e72b08d75ac75289920b1f';

/** Human-readable size for UI copy (~74 MB on disk). */
export const WHISPER_MODEL_SIZE_LABEL = '74 MB';

/** Extra free space required beyond the model size (temp file + headroom). */
export const WHISPER_MODEL_STORAGE_HEADROOM_BYTES = 8_000_000;

/**
 * Quantised candidates evaluated for a later size pass.
 * Do not switch production until device accuracy QA passes.
 */
export const WHISPER_QUANT_CANDIDATES = [
  {
    id: 'tiny.en-q8_0',
    filename: 'ggml-tiny.en-q8_0.bin',
    approxBytes: 43_550_795,
    notes: 'Compatible with whisper.cpp; ~42 MB. Candidate if accuracy holds.',
  },
  {
    id: 'tiny.en-q5_1',
    filename: 'ggml-tiny.en-q5_1.bin',
    approxBytes: 32_166_155,
    notes: 'Smallest common quant; needs UK accent / site-noise QA before adoption.',
  },
] as const;

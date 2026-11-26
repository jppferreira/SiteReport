import {
  WHISPER_MODEL_BYTES,
  WHISPER_MODEL_HF_COMMIT,
  WHISPER_MODEL_SHA256,
  WHISPER_MODEL_URL,
  WHISPER_QUANT_CANDIDATES,
} from './whisperModelConfig';

describe('whisperModelConfig', () => {
  it('pins the Hugging Face commit and expected checksum', () => {
    expect(WHISPER_MODEL_HF_COMMIT).toMatch(/^[a-f0-9]{40}$/);
    expect(WHISPER_MODEL_SHA256).toBe(
      '921e4cf8686fdd993dcd081a5da5b6c365bfde1162e72b08d75ac75289920b1f'
    );
    expect(WHISPER_MODEL_BYTES).toBe(77_704_715);
    expect(WHISPER_MODEL_URL).toContain(WHISPER_MODEL_HF_COMMIT);
    expect(WHISPER_MODEL_URL.startsWith('https://')).toBe(true);
  });

  it('documents quantised candidates without selecting them', () => {
    expect(WHISPER_QUANT_CANDIDATES.length).toBeGreaterThanOrEqual(2);
    expect(WHISPER_QUANT_CANDIDATES.every((c) => c.approxBytes < WHISPER_MODEL_BYTES)).toBe(true);
  });
});

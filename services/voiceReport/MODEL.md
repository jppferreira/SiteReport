# Whisper model bundling

## Selected model

| Item | Value |
| --- | --- |
| Model | `tiny.en` (English-only) |
| File | `assets/whisper/ggml-tiny.en.bin` |
| Approx. size | **~75 MB** |
| Runtime | `whisper.rn` / whisper.cpp, on-device |

`tiny.en` is the Phase 1 default for app size and latency on mid-range phones.
`base.en` (~142 MB) can be benchmarked later for accuracy; swap the asset and
`WHISPER_MODEL_ID` if device testing justifies the size cost.

## Download

```bash
npm run voice:model
```

EAS/CI release builds must run this (or otherwise provide the `.bin`) before
bundling so first transcription does not require a network download.

## Size implications

- Adds ~75 MB to the store binary (plus native whisper.rn libraries).
- Increases RAM during inference; release builds should be checked on older
  physical devices (especially Android mid-range).
- Core ML encoder assets for iOS are **not** bundled in Phase 1 (would grow the
  iOS binary further). Metal/`useGpu` is enabled on iOS when available.

## Benchmark plan (physical devices)

1. Record a 30–60s UK trade note (kitchen tap / consumer unit / decorating).
2. Measure time-to-transcript for `tiny.en` on a recent phone and an older phone.
3. Repeat with `base.en` if accuracy issues appear on site noise / accents.
4. Keep `tiny.en` unless `base.en` clearly improves without unacceptable lag or OOM.

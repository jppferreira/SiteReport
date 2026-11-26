# Whisper model delivery

## Selected model

| Item | Value |
| --- | --- |
| Model | `tiny.en` (English-only) |
| File | `ggml-tiny.en.bin` |
| Approx. size | **~74 MB** (77,704,715 bytes) |
| Runtime | `whisper.rn` / whisper.cpp, on-device |
| Delivery | **On-demand download** on first voice transcription |
| Storage | Persistent app-private directory (not Metro-bundled) |
| Pinned URL | Hugging Face commit `5359861c739e955e79d9a303bcbc70fb988958b1` |
| SHA-256 | `921e4cf8686fdd993dcd081a5da5b6c365bfde1162e72b08d75ac75289920b1f` |

## Why on-demand

Bundling the model added ~75 MB to the store binary. The model is now downloaded once when the user first opens voice reports, verified with SHA-256, then reused offline forever (until the user clears app storage).

## Local optional copy

```bash
npm run voice:model
```

Writes to `assets/whisper/` for tooling only. **Do not** `require()` this file — Metro would re-bundle it.

Production / EAS builds **must not** run an automatic model download into the asset tree.

## Upgrade behaviour

Users upgrading from a build that bundled the model will need a one-time download: the old asset lived inside the binary and is not copied into Documents automatically.

## Quantised candidates (not adopted yet)

| Model | Approx. size | Status |
| --- | ---: | --- |
| `tiny.en-q8_0` | ~42 MB | Compatible with whisper.cpp; QA pending |
| `tiny.en-q5_1` | ~31 MB | Smallest common quant; QA pending for UK accents / site noise |

Do not switch until device benchmarks cover accuracy, speed, memory, battery, and trade terminology.

## Licensing

OpenAI Whisper weights and whisper.cpp GGML conversions are MIT-licensed. Redistribution of the GGML file for on-device inference is permitted under that license; keep attribution in third-party notices if the store listing requires it.

## Benchmark plan (physical devices)

1. Record a 30–60s UK trade note (kitchen tap / consumer unit / decorating).
2. Measure time-to-transcript for `tiny.en` on a recent phone and an older phone.
3. Repeat with `tiny.en-q8_0` / `tiny.en-q5_1` if size needs a further cut.
4. Keep `tiny.en` unless a quant clearly matches accuracy without unacceptable lag or OOM.

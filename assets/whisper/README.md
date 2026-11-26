# Whisper assets

Production builds **do not** ship `ggml-tiny.en.bin`. The app downloads a pinned, checksummed copy on first use of voice reports and stores it in persistent app-private storage.

Optional local copy for tooling:

```bash
npm run voice:model
```

Do not `require()` the `.bin` into JavaScript — that re-bundles ~74 MB into the binary.
See `services/voiceReport/MODEL.md`.

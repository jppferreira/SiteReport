# Voice-to-Report — privacy & network audit

Trade Report’s voice feature is designed so a tradesperson can dictate job notes
**without sending audio, transcripts, or customer details to Trade Report servers
or to hosted AI APIs.**

## What stays on the device

| Data | Handling |
| --- | --- |
| Microphone audio | Captured locally, written to a temporary WAV under the app cache, deleted after transcription, cancel, or failure |
| Whisper transcript | Produced by on-device `whisper.rn` / whisper.cpp (`tiny.en`, bundled) |
| Professional rewrite | On-device only when an approved engine is available; otherwise deterministic `LocalReportFormatter` |
| Saved report text | Written only through the existing SQLite / local file storage used by jobs |

There is **no** OpenAI, Google Cloud, Azure, or Trade Report inference endpoint in this feature.

## Network activity

### Trade Report app code

Voice recording, Whisper transcription, and the local formatter perform **no network I/O**.
Once the Whisper model is bundled in the app binary, the feature is intended to work in
airplane mode.

### Apple Foundation Models (iOS, when available)

Uses `SystemLanguageModel` on-device. Trade Report does **not** opt into Private Cloud Compute
for this feature. If the model is unavailable, installing, or unsupported, the UI falls back
to local formatting and keeps the raw transcript.

### Android GenAI / Gemini Nano (not enabled)

Google’s ML Kit GenAI Prompt API can run Gemini Nano on-device for inference, and Google
states that prompt content is not sent to Google for that inference. However, ML Kit SDKs
may still contact Google for model/compatibility updates and send **diagnostic/usage
telemetry** (device/app identifiers, latency, API configuration, error codes).

That telemetry does **not** meet Trade Report’s current no-transmission bar for speech /
report features, so **`AndroidLocalAIAdapter` remains disabled**. Android users still get
offline Whisper transcription and local formatting.

Revisit only after a written privacy review confirms we can meet Play Data Safety
disclosures and that no job content leaves the device.

### Other existing app network use (unchanged)

In-app purchases, optional bug reports the user sends, and optional backup/share flows are
separate from voice and are documented in the main privacy policy.

## Backup & retention

- Temporary WAVs live in cache and are deleted after use.
- Temporary voice files are not part of job backup archives.
- Users can clear job data from Settings → Data as today.
- Microphone permission can be revoked in system Settings; the feature then shows a clear
  permission-denied state with a link to Settings.

## GDPR note

Keeping processing on-device reduces personal-data exposure; it does **not** make GDPR
irrelevant. Job reports may still contain customer names, addresses, and notes stored
locally. Trade Report minimises collection (no voice analytics accounts, no transcript
upload) and documents remaining considerations in the in-app privacy policy.

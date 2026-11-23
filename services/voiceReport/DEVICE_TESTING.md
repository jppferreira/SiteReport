# Device testing — Voice-to-Report

Requires a **development build** or store build with native modules. Expo Go is
not sufficient (`whisper.rn`, `@fugood/react-native-audio-pcm-stream`,
`apple-foundation-models`).

## Prepare

```bash
npm install
npm run voice:model
npx expo prebuild
npx expo run:ios
# or
npx expo run:android
```

Enable airplane mode after the app is installed (model is already bundled).

## Acceptance checks

1. Open a job → Work Summary → tap the bottom-right mic.
2. Allow microphone permission when prompted.
3. Record ~20s of natural speech, e.g.  
   “Changed the tap in the kitchen, fixed the leak underneath, checked it all and everything's working.”
4. Stop → wait for on-device transcription (and AI rewrite when available).
5. Confirm the **Work Summary** field is filled automatically (local formatting when AI is unavailable).
6. Confirm **Undo voice insert** restores the previous summary text.
7. Deny mic in Settings → open mic again → clear permission messaging + Open Settings.
8. Confirm PDF generate/share still works for the job.
9. On a device **without** Apple Intelligence / Android local AI, confirm local
    formatting still works and is labelled as formatted (not silent cloud AI).

## Suggested speech cases

- UK accents and trade terms (consumer unit, isolating valve, silicone, screed)
- Measurements and prices (“two metres of copper, eighty quid”)
- Noisy background (van / site radio)
- Outstanding work (“still needs checking”) — must not become “checked”
- Short silence → “No speech detected”

## Platforms

| Platform | Transcription | Professional rewrite |
| --- | --- | --- |
| iOS with Apple Intelligence + Foundation Models | Whisper `tiny.en` | On-device when module reports available |
| iOS without Apple Intelligence | Whisper `tiny.en` | Local formatter |
| Android | Whisper `tiny.en` | Local formatter (GenAI deferred — see PRIVACY.md) |
| Web preview | Unavailable | Unavailable |

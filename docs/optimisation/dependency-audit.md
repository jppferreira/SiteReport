# Dependency & native module audit

**Date:** 2026-11-26  
**Branch:** `optimisation/app-size-reduction`

## Verdict legend

| Tag | Meaning |
| --- | --- |
| KEEP | Required for a shipped feature |
| KEEP (size watch) | Required; native weight is material |
| TRIMMED | Packaging/config change reduces size without removal |
| CANDIDATE | Possible future removal after product sign-off |

## Runtime dependencies

| Package | Used for | Verdict | Notes |
| --- | --- | --- | --- |
| `whisper.rn` | On-device STT | KEEP (size watch) | Native libs remain; **model no longer bundled** |
| `@stewmore/expo-ar` | AR measure | KEEP (size watch) | Single plugin entry in `app.json` (no duplicate) |
| `@expo/vector-icons` | UI icons | TRIMMED | App uses Ionicons only; Metro `blockList` excludes other TTFs |
| `@expo-google-fonts/lexend` | Brand type | KEEP | Only 400/500/600/700 loaded in `_layout`; unused weight files should not pack if not imported |
| `@fugood/react-native-audio-pcm-stream` | Voice PCM capture | KEEP | Required for Whisper input |
| `expo-audio` | Level tool sounds / audio | KEEP | Overlap with PCM stream is intentional (different APIs) |
| `expo-video` | Video evidence / capture paths | KEEP | Confirm all call sites before considering removal |
| `expo-camera` | Photos + AR | KEEP | |
| `expo-image` | All UI imagery | KEEP | Prefer over RN Image; supports animated WebP |
| `expo-image-manipulator` | Annotation / export | KEEP | |
| `react-native-webview` | Document/HTML preview paths | KEEP | |
| `react-native-reanimated` / `worklets` | Motion, FAB, progress | KEEP | Large native libs; required by Expo Router stack |
| `expo-sqlite` | Offline DB | KEEP | |
| `expo-iap` | Subscriptions | KEEP | |
| `expo-build-properties` | R8 + shrinkResources + keep rules | KEEP (new) | Config-only; enables Android resource shrinking |
| Local modules (`apple-foundation-models`, `google-drive-save`, `icloud-backup`) | Platform backups / AI | KEEP | |

## Overlaps considered (not removed)

- `expo-audio` vs `@fugood/react-native-audio-pcm-stream` — different pipelines (playback/UI vs Whisper PCM).
- `expo-image` vs `expo-image-manipulator` — display vs transform.
- No safe removal without feature loss from static analysis alone.

## Native library size (arm64, vc7 AAB sample)

Dominant: `libreactnative`, `libhermesvm`, `libappmodules`, `libexpo-sqlite`, `libreanimated`, `libworklets`, `libexpo-modules-core`. Whisper native libs appear only in post-vc7 builds that link `whisper.rn`.

## Android production (SDK 58)

- R8 minify is **on by default** for release.
- Enabled `enableShrinkResourcesInReleaseBuilds` via `expo-build-properties`.
- Added ProGuard keep rules for Whisper, AR, SQLite, IAP/Billing, Reanimated/Worklets, Expo modules.
- AAB + Play ABI splits remain (`buildType: app-bundle`).

## iOS production

- No IPA in-repo for measurement; validate with Xcode Organizer / App Store Connect after next archive.
- Preserve dSYMs for crash reporting (external; not inside the thinned download).
- Dead code stripping / Release optimisation remain Xcode defaults from prebuild — do not hand-edit `ios/` (regenerated on EAS).

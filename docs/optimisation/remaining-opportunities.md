# Remaining optimisation opportunities

After the changes on `optimisation/app-size-reduction`, these are the next highest-value cuts that were **not** applied (need QA or product sign-off).

1. **Whisper Q8 / Q5** (~42 MB / ~31 MB download instead of 74 MB) — keep `tiny.en` until UK accent / site-noise accuracy QA passes (`WHISPER_QUANT_CANDIDATES` in `whisperModelConfig.ts`).
2. **Onboarding JPG heroes** (~1.1 MB combined) → WebP at display size.
3. **`crew-diy` combinatorial WebP set** — large tree; consider generating layers at runtime or shipping fewer presets.
4. **`expo-video` / `expo-camera` footprint** — confirm every native path is required on both platforms; platform-exclusion is non-trivial with Expo autolinking.
5. **Hermes bytecode / bundle compression** — `enableBundleCompression` trades startup for size; measure cold start on mid-range Android before enabling.
6. **Verify icon font blockList** on a production AAB (`base/res/raw` should list Ionicons only).
7. **iOS App Thinning report** — capture download vs install from App Store Connect after the first archive without the bundled Whisper model.
8. **Play Console device APK sizes** via bundletool once a post-change AAB is produced.

## Estimated vs verified

| Item | Estimated saving | Verified? |
| --- | ---: | --- |
| Remove bundled Whisper | ~70–75 MB download | Pending production AAB/IPA |
| Image/GIF WebP + dedupe | ~5–7 MB resources | Pending AAB `res/` diff |
| Icon font blockList | ~2–4 MB | Pending AAB `raw/` inventory |
| Android shrinkResources | 0–few MB | Pending AAB |
| **Target** | **50–70 MB initial download** | Requires store build measurement |

# TradeReport — App size baseline

**Branch:** `optimisation/app-size-reduction`  
**Date:** 2026-11-26  
**App version analysed:** 1.1.0 (source) / sample AAB `tradesreport-1.0.0-vc7.aab` (1.0.0, 2025-10-15)

> Git repository size is **not** application size. This baseline uses production AAB contents, source assets, and packaging configuration.

---

## 1. Headline sizes

| Artefact | Size | Notes |
| --- | ---: | --- |
| Sample production AAB (vc7) | **86 MB** on disk / ~90 MB zip-compressed listing | Pre-Whisper era; no `ggml-*.bin`, no `librnwhisper` |
| Older `dist/tradesreport-1.0.0.aab` | 81 MB | Same generation |
| Whisper `ggml-tiny.en.bin` (source) | **74.1 MB** (77,704,715 bytes) | Fetched in `eas-build-post-install` → bundled when required |
| Reported store download (user brief) | **~139 MB** | Consistent with ~60–70 MB base + ~75 MB Whisper |
| Target initial download | **50–70 MB** | After removing Whisper from the package |

### Estimated device download (Play, arm64-v8a) from vc7 AAB

Rough compressed contribution (from zip listing):

| Slice | Uncompressed | Approx. compressed |
| --- | ---: | ---: |
| `base/lib/arm64-v8a` | 25.0 MB | ~8.5 MB |
| DEX | 47.8 MB | ~16 MB |
| `base/res` | 13.7 MB | ~7 MB |
| Hermes JS bundle | 4.9 MB | ~2.2 MB |
| **Subtotal (no Whisper)** | | **~35–45 MB** (+ Play packaging overhead) |

Debug symbols live under `BUNDLE-METADATA/.../debugsymbols` (~100 MB uncompressed) and are **not** part of the user download.

**iOS:** No IPA was available in-repo for this audit. Measure via Xcode Organizer / App Store Connect after the next archive. Expect similar Whisper impact (~75 MB) once the model is linked as a Metro asset.

---

## 2. Largest contributors (by category)

### 2.1 Bundled AI model (Priority 1 — dominant)

| Item | Size | Packaging today |
| --- | ---: | --- |
| `assets/whisper/ggml-tiny.en.bin` | 74.1 MB | `require()` in `constants.ts` + `eas-build-post-install` |
| SHA-256 | `921e4cf8…9920b1f` | Matches Hugging Face content etag |

Removing this from the binary is the only change that can hit the 50–70 MB target alone.

### 2.2 Images & illustrations (`assets/images`, excl. samples)

| Asset | Size |
| --- | ---: |
| `onboarding-welcome-hero.png` | 2.09 MB |
| `splash-crew.png` | 2.09 MB (**identical hash** to welcome hero) |
| `report-ready.png` | 1.06 MB |
| `brand-mark.png` | 0.74 MB |
| `nothing-here-yet.png` / `no-matching-jobs.png` / etc. | 0.3–0.6 MB each |

In the vc7 AAB, `splash-crew` alone appears as **1.83 MB** drawable. Duplicate welcome/splash PNGs are both referenced from code → both ship.

### 2.3 Animations

| Asset | Size |
| --- | ---: |
| `creating-report-build.gif` | 1.66 MB |
| `creating-report-build.webm` | 0.55 MB |
| `crew-avatar-idle.gif` | 0.50 MB |

### 2.4 Fonts & icon packs (inside AAB `base/res/raw`)

| Resource | Size | Used by app? |
| --- | ---: | --- |
| MaterialCommunityIcons.ttf | 1.31 MB | Unlikely — app uses Ionicons |
| MaterialSymbols_400Regular.ttf | 0.97 MB | Not referenced in app source |
| FontAwesome6 Solid / Brands / Regular | ~0.7 MB combined | Not referenced |
| Ionicons.ttf | 0.39 MB | **Yes** |
| Lexend weights 100–900 (all nine) | ~0.71 MB | Only **400/500/600/700** loaded in `_layout.tsx` |

### 2.5 Native libraries (arm64-v8a, vc7)

| Library | Size |
| --- | ---: |
| `libreactnative.so` | 6.99 MB |
| `libhermesvm.so` | 2.48 MB |
| `libappmodules.so` | 1.91 MB |
| `libexpo-sqlite.so` | 1.83 MB |
| `libexpo-modules-core.so` | 1.49 MB |
| `libreanimated.so` | 1.50 MB |
| `libworklets.so` | 1.10 MB |
| Other | ~6 MB |

Whisper native libs are **absent** from vc7 (added later with `whisper.rn`).

### 2.6 Repo-only bloat (must stay out of the binary)

| Path | Size | Already in `.easignore`? |
| --- | ---: | --- |
| `store/` (screenshots, ASC, Play) | 260 MB | Mostly yes |
| `assets/samples/` | 15 MB | **No** — risk if `assetBundlePatterns: ["**/*"]` pulls them |
| `website/` | 5.2 MB | Yes |
| `dist/` | 81 MB | Yes |

---

## 3. Duplicate assets (content hash)

| Hash (prefix) | Paths |
| --- | --- |
| `bb47fa1a…` | `onboarding-welcome-hero.png`, `splash-crew.png`, `samples/style-ref/splash-crew.png` |
| `c430b6ef…` | `crew-avatar-portrait.png`, `crew-avatars/crew-00.png` |
| Multiple crew-diy skin / bald duplicates | See optimisation asset report |

---

## 4. Config risks

1. **`assetBundlePatterns: ["**/*"]`** — obsolete/broad; can pull unintended files under `assets/`.
2. **`eas-build-post-install` → download Whisper** — forces model into the build tree even though `.easignore` excludes the committed bin.
3. **`app.config.js` `extra.githubBugReportToken`** — PAT can be embedded in the shipped `app.config` / JS bundle when the EAS secret is set (**security**).
4. **`@stewmore/expo-ar`** — single plugin entry in current `app.json` (duplicate registration from the brief is **not** present now).

---

## 5. Quantised Whisper variants (investigation — not adopted yet)

| Model | Disk | Notes |
| --- | ---: | --- |
| `tiny.en` (current) | 74.1 MB | Keep until accuracy QA of Q5/Q8 |
| `tiny.en-q8_0` | ~41.5 MB | Compatible with whisper.cpp / whisper.rn |
| `tiny.en-q5_1` | ~30.7 MB | Smallest candidate; needs UK accent / site-noise QA |

Do **not** switch production until device benchmarks pass (see MODEL.md).

---

## 6. Planned savings (estimated)

| Change | Est. download saving |
| --- | ---: |
| On-demand Whisper (remove from package) | **~70–75 MB** |
| WebP + dedupe heroes / illustrations | **~3–6 MB** |
| GIF → optimised WebP/video | **~1–1.5 MB** |
| Trim unused Lexend + icon fonts | **~2–4 MB** |
| Exclude `assets/samples` + tighten bundling | **0–few MB** (verify in binary) |
| **Total vs ~139 MB builds** | **→ target 50–70 MB** |

Verified numbers require a post-change production AAB/IPA (bundletool / ASC).

---

## 7. Next measurement checkpoints

1. After Whisper on-demand: production AAB + Play device APK size (arm64).
2. After asset/WebP pass: redrawable sizes in AAB `base/res`.
3. After font/icon trim: `base/res/raw` inventory.
4. iOS App Thinning report from Xcode Organizer.

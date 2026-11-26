# Asset optimisation report

**Date:** 2026-11-26  
**Branch:** `optimisation/app-size-reduction`

## Changes

| Before | After | Action |
| --- | ---: | --- |
| `onboarding-welcome-hero.png` 2.09 MB | — | Deduped → `crew-hero.webp` |
| `splash-crew.png` 2.09 MB | — | Deduped → `crew-hero.webp` |
| `crew-hero.webp` | **151 KB** | Shared splash + onboarding hero (1100px, q82) |
| `report-ready.png` 1.06 MB | `report-ready.webp` **21 KB** | Resize 720w, q80 |
| `creating-report-build.gif` 1.66 MB | `.webp` **356 KB** | gif2webp q75 |
| `creating-report-build.webm` 0.55 MB | removed | Unused |
| `brand-mark.png` 0.74 MB @1254 | **100 KB** @360 | Native splash only |
| `brand-mark.webp` | **8 KB** @512 | In-app `BrandMark` |
| `nothing-here-yet.png` 0.60 MB | `.webp` **46 KB** | |
| `no-matching-jobs.png` 0.57 MB | `.webp` **46 KB** | |
| `coffee-mug.png` 0.44 MB | `.webp` **20 KB** | |
| Unused `privacy-shield` / `no-jobs-yet` | removed | No code references |

## Estimated packaged saving (these assets)

≈ **8–9 MB** of source weight removed/replaced; AAB drawable contribution for splash-crew alone was ~1.8 MB — expect **~5–7 MB** smaller compressed resources after rebuild (verify in next AAB).

## Config

- Removed obsolete `assetBundlePatterns: ["**/*"]` from `app.json` (Metro only packs `require()`d assets).
- `.easignore` now excludes `assets/samples/` and `docs/`.

## Not touched

- User job photos (runtime, not bundled).
- App icons / adaptive icon PNGs (platform tooling).
- `crew-diy` / `crew-layers` WebP set (already compressed; further cuts need product review).
- Onboarding JPG heroes (~0.25–0.30 MB each) — acceptable; optional later WebP pass.

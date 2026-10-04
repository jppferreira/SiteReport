# SiteReport

A local-first mobile app for tradespeople and small service businesses to document completed
jobs — before/after photos, a work summary, an optional customer signature — and turn them into
a professional, branded PDF report that's ready to share in minutes.

**Your job data stays on your device.** SiteReport has no accounts, no sign-in, and no cloud
database. Jobs, customer names, addresses, notes, photos, signatures, and generated reports are
stored only in this app's local storage on your phone or tablet. Nothing about a job is ever
uploaded automatically. The only network calls this app makes are the ones your OS makes for
in-app purchases through the App Store or Play Store.

## What's in this app

- **Create a job** in seconds — only a title is required.
- **Before/after photos** with captions, reordering, and full-screen review.
- **Work summary** notes (work completed, materials, recommendations) with autosave.
- **Optional customer signature**, captured with a hand-drawn signature pad.
- **One-tap PDF report** generation, previewed in-app, then shared or saved via the native share
  sheet (or saved straight to a folder on Android).
- **Reports tab** to revisit, re-share, regenerate, or delete past reports.
- **Business profile & branding** — your logo, contact details, and (on Pro) a custom accent
  colour on every report.
- **Free vs Pro**: the free tier includes 3 reports; Pro unlocks unlimited reports, full
  branding, and signatures. Pricing is always read live from the store, never hardcoded.

## Tech stack

- [Expo](https://expo.dev) (SDK 57) + React Native + TypeScript, file-based routing via
  [Expo Router](https://docs.expo.dev/router/introduction/)
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) for on-device persistence
- [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/),
  [expo-image-manipulator](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/) for photo
  storage, resizing, and thumbnails
- [expo-print](https://docs.expo.dev/versions/latest/sdk/print/) for PDF generation from an
  HTML/CSS report template, [expo-sharing](https://docs.expo.dev/versions/latest/sdk/sharing/)
  for the native share sheet
- [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) for the entitlement
  cache, `react-native-reanimated` + `react-native-gesture-handler` for interaction and gesture
  polish, `react-native-svg` for the hand-built signature canvas
- A `PurchaseService` / `EntitlementService` abstraction so the rest of the app only ever asks
  `hasProAccess()` — see [`services/purchases/README.md`](services/purchases/README.md) for how
  the current mock store maps to a real `react-native-iap` integration for production.

## Getting started

```bash
npm install
npm run web      # browser preview via react-native-web, http://localhost:44321
npm run ios      # requires Xcode + a simulator
npm run android  # requires Android Studio + an emulator or device
```

Other useful scripts:

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # expo lint
npm test             # jest unit tests
```

### Notes on the web preview

SiteReport's primary targets are iOS and Android; the web build exists mainly so the app can be
previewed without native tooling. A few native-only behaviours (haptics, the native date picker,
camera capture, native share sheet, in-app purchases) gracefully degrade or no-op on web rather
than crashing — exercise those flows on a real device or simulator for full fidelity.

## Project structure

```
app/                  Expo Router screens (file-based routing)
components/           Shared, reusable UI primitives (Button, Card, Modal, Toast, ...)
features/             Feature-specific UI and pure business logic (jobs, photos, signature, ...)
database/              SQLite client + one repository per table
services/             File storage, image processing, PDF generation, sharing, purchases, ...
hooks/                 Data-fetching and autosave hooks that wire screens to services/database
models/                Shared TypeScript types for Job, Photo, Report, BusinessProfile, ...
theme/                 Design tokens: colors, spacing, typography, radius, shadows
utils/                 Pure helper functions (formatting, validation, file naming, ids)
```

## Production builds

[`eas.json`](eas.json) defines `development`, `preview`, and `production`
[EAS Build](https://docs.expo.dev/build/introduction/) profiles. Before building for a store:

1. Run `eas init` to attach this project to a real EAS project (replace the placeholder
   `extra.eas.projectId` in `app.json`).
2. Replace the mock purchase service with a real `react-native-iap` integration — see
   [`services/purchases/README.md`](services/purchases/README.md).
3. Confirm the bundle identifiers in `app.json` (`com.sitereport.app`) match your App Store
   Connect / Google Play Console listings.

## Known limitations

- **In-app purchases are mocked.** This project was built in a sandboxed environment without
  Xcode, the Android SDK, or App Store/Play Console access, so real IAP cannot be built or
  tested here. `services/purchases/MockPurchaseService.ts` simulates every purchase state
  (success, cancelled, pending, failed, expired, renewed, lifetime, restore) behind the same
  `PurchaseService` interface a real store integration would implement.
- **No real iOS/Android builds have been produced or tested** in this environment, for the same
  reason — only `tsc --noEmit`, `expo lint`, `jest`, and the web preview have been exercised.
- **PDF page numbers are not dynamic.** CSS Paged Media margin-box counters are not reliably
  supported across the WebView engines `expo-print` renders through on iOS/Android, so reports
  use a single summary footer at the end of the document rather than a "Page X of Y" on every
  page.

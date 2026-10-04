# SiteReport

SiteReport is a local-first React Native app (Expo + TypeScript) for tradespeople and service businesses.

It helps users capture before/after photos, document work, collect optional customer sign-off, and generate professional PDF job reports directly on device.

## Privacy model

- No account required.
- Job/customer data is stored locally on the device.
- Photos, signatures, and generated reports stay local unless the user explicitly shares a report.
- No remote customer/job storage is used.

## Tech stack

- Expo Router
- TypeScript (strict mode)
- Expo SQLite (structured local persistence)
- Expo FileSystem (photo/signature/report files)
- Expo Camera + Expo Image Picker
- Expo Print + Expo Sharing
- Expo SecureStore (entitlement cache metadata)
- Expo IAP (store purchases)
- Reanimated + Gesture Handler

## Getting started

```bash
npm install
npm run start
```

### Open on device/simulator

```bash
npm run ios
npm run android
```

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
```

## Production build configuration

This project includes EAS build profiles:

- `development`
- `preview`
- `production`

Before shipping:

1. Replace bundle identifiers in `app.json`.
2. Set a real `extra.eas.projectId`.
3. Configure real product IDs in `services/purchaseService.ts`.
4. Add production icons/splash assets.
5. Configure StoreKit/Play Billing products to match app IDs.

## Project structure

```text
app/                Expo Router screens
components/         Reusable UI components
features/           Pure feature logic helpers
hooks/              App-level state hooks/providers
models/             Typed domain models
services/           Persistence/files/pdf/purchases/permissions
theme/              Design tokens
utils/              Utilities
tests/              Unit tests for critical logic
```

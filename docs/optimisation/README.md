# App size optimisation — TradeReport

Working branch: **`optimisation/app-size-reduction`**

## Documents

| Doc | Purpose |
| --- | --- |
| [app-size-baseline.md](./app-size-baseline.md) | Pre-change AAB/asset/font baseline |
| [asset-optimisation.md](./asset-optimisation.md) | WebP / dedupe / packaging changes |
| [dependency-audit.md](./dependency-audit.md) | Dependency + native size notes |
| [security-audit.md](./security-audit.md) | PAT exposure + rotation flag |
| [remaining-opportunities.md](./remaining-opportunities.md) | Next cuts + estimated vs verified |
| [rollback.md](./rollback.md) | How to undo by category |

## Implemented on this branch

1. **On-demand Whisper** — ~74 MB model removed from the binary; first voice use downloads a pinned, SHA-256-verified copy into persistent storage.
2. **Asset WebP + dedupe** — shared `crew-hero.webp`, compressed empty states / report-ready / build animation.
3. **Packaging** — removed `assetBundlePatterns: ["**/*"]`; EAS ignores `assets/samples` + docs.
4. **Icons** — Ionicons-only Metro blockList; dropped MaterialCommunityIcons usage.
5. **Android** — shrinkResources + keep rules via `expo-build-properties` (R8 already default on SDK 58).
6. **Security** — no GitHub PAT in Expo `extra`; contact via mailto.

## Next step for verified numbers

Run EAS production builds for iOS and Android from this branch, then compare device download sizes to the baseline (Play Console / App Store Connect). Do not publish without regression sign-off.

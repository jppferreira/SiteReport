# Security audit — credentials in app config

**Date:** 2026-11-26  
**Branch:** `optimisation/app-size-reduction`

## Finding

`app.config.js` previously copied `GITHUB_BUG_REPORT_TOKEN` / `EXPO_PUBLIC_GITHUB_BUG_TOKEN` into Expo `extra.githubBugReportToken`.

Anything in `extra` is embedded in the shipped app (`Constants.expoConfig.extra` / bundled `app.config`). A fine-grained GitHub PAT with Issues: Write on `jppferreira/SiteReport` would therefore be recoverable from any distributed build that was compiled with that env var set.

`EXPO_PUBLIC_*` variables are likewise inlined into the JavaScript bundle.

## Actions taken

1. Removed `githubBugReportToken` from `app.config.js` `extra`.
2. Removed authenticated GitHub Issues API calls from the app.
3. Contact / crash reports now open the device mail app (`mailto:hello@jppferreira.com`) with a prefilled body — no secrets required.
4. Kept a public `githubNewIssueUrl()` helper for optional manual filing (no credentials).
5. Updated privacy copy to match mail delivery.

## Token rotation (required ops)

**Flag for immediate rotation:** If any production or TestFlight/Play internal build was ever produced with `GITHUB_BUG_REPORT_TOKEN` or `EXPO_PUBLIC_GITHUB_BUG_TOKEN` set in EAS secrets / env, treat that PAT as **compromised**.

1. Revoke/rotate the fine-grained PAT in GitHub → Settings → Developer settings.
2. Remove `GITHUB_BUG_REPORT_TOKEN` and `EXPO_PUBLIC_GITHUB_BUG_TOKEN` from EAS secrets and local `.env` files.
3. Confirm new store builds do not contain the string `githubBugReportToken` or `ghp_` / `github_pat_` in the JS bundle.

This audit does **not** print or log any credential values.

## Residual risk

Older installs that already contain a leaked token keep that token until the user updates. Rotation at GitHub invalidates those embedded copies.

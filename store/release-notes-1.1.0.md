# Trade Report 1.1.0

**iOS:** 1.1.0 · **Android:** 1.1.0

## What’s new

- **Jobs home + documents** — Quote / Report / Invoice segments, money summary, and job cards with document badges.
- **Quotes & invoices** — create, send, track status, mark accepted/paid; Pro document PDFs.
- **Photo annotations on reports** — pins, notes, pen, arrows, and circles appear in the generated PDF.
- **On-device voice dictation** — dictate job notes; audio is transcribed on this device and is not uploaded.
- **Evidence stamps** — optional location and verified-on-device labels on photos (Pro).
- **Job checklists** — Field Proof checklists for handover-ready reports.
- **AR measure & spirit level** — Toolbox tools to measure distances and check surfaces; save into the report.
- **Premium report templates** — additional branded PDF looks.
- **Backups** — manual zip backup; optional iCloud auto-backup on iPhone to your own iCloud Drive.

Store screenshots for every primary feature: `store/screenshots/1.1.0-store-set/` (also copied to `store/ios-headers/` and `store/play/`). Listing copy updated in `store/app-store-connect.md` and `store/google-play.md`.

## Store / privacy checklist for this release

- [x] Publish updated `website/privacy.html` and `website/terms.html` (24 November 2026) — live on tradereportapp.com.
- [x] Google Play en-GB listing copy updated via API (voice, AR, checklists, subscription wording).
- [x] App Store Connect: created iOS **1.1.0** (`PREPARE_FOR_SUBMISSION`) with updated en-GB/en-US listing copy. Live **1.0** metadata stays locked until that version ships; privacy URL already correct.
- [x] Update App Privacy (ASC): FormSubmit → GitHub for optional messages — verified in ASC (Customer Support + Other Diagnostic Data; App Functionality; not linked; not tracking). Privacy Policy URL `https://tradereportapp.com/privacy.html`. Nutrition labels do not name FormSubmit/GitHub; policy text covers GitHub Issues.
- [x] Play Data Safety form uploaded via API (optional support messages + app version/platform; no account; deletion via privacy page).
- [x] Confirm privacy policy URL still `https://tradereportapp.com/privacy.html`.
- [x] Android: block `ACTIVITY_RECOGNITION` and `SYSTEM_ALERT_WINDOW`; disable expo-audio background playback FGS.
- [x] Android AR measure: library pick uses system photo picker (no broad media permission).
- [x] Play Console account: declare trader status (Trader) + app-level confirm + ToS; Data safety + trader sent for review (24 Nov 2026).

## Checks before release

- Typecheck: pass
- Lint: pass (0 errors; store/website scripts excluded from app lint)
- Feature / PDF unit tests: pass (AR, level, voice, conversion, backup, checklists, annotations)
- iPhone-only for this cut (`supportsTablet: false`) — no iPad screenshot set required

## Known notes

- A callout on the extreme photo edge can sit slightly inset in the PDF so the pin stays inside the rounded frame.
- Debug route `/debug-github-report` exists for support tooling and is not linked from Settings.
- Live device QA for mic, GPS stamp, AR, and Drive/iCloud still needs a store or local native build.
